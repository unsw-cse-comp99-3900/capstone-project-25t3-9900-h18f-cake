# -*- coding: utf-8 -*-
from typing import List, Dict, Tuple
import torch
import torch.nn as nn
import numpy as np
from sentence_transformers import SentenceTransformer
from config import EMB_MODEL_NAME, PRIOR_MODEL_PATH, DEVICE

class PriorNet(nn.Module):
    """Simple MLP that outputs mean and log-variance for each dimension."""
    def __init__(self, emb_size: int, num_dims: int, hidden: int = 256):
        super().__init__()
        self.backbone = nn.Sequential(
            nn.Linear(emb_size, hidden),
            nn.ReLU(),
            nn.Linear(hidden, hidden),
            nn.ReLU()
        )
        self.mu_head = nn.Linear(hidden, num_dims)
        self.logvar_head = nn.Linear(hidden, num_dims)

    def forward(self, x):
        h = self.backbone(x)
        mu = self.mu_head(h)
        logvar = self.logvar_head(h)
        return mu, logvar

class PriorEstimator:
    """
    Train/predict a prior (mu, sigma) per dimension using embedding as input.
    """
    def __init__(self, num_dims: int):
        self.model = None
        self.encoder = SentenceTransformer(EMB_MODEL_NAME, device=DEVICE)
        self.num_dims = num_dims

    def _init_model(self, emb_size: int):
        self.model = PriorNet(emb_size, self.num_dims).to(DEVICE)

    def encode_dim_concat(self, dim_texts: List[str]) -> np.ndarray:
        """
        Concatenate all dim texts to a single representation (mean pooling).
        """
        embs = self.encoder.encode(dim_texts, convert_to_numpy=True, normalize_embeddings=True)
        return embs.mean(axis=0, keepdims=True)  # shape (1, emb)

    def fit(self, train_batch: List[Dict], dim_order: List[str], lr=1e-3, epochs=10):
        """
        train_batch: list of dict => {"dim_texts": {dim_id: text}, "scores": {dim_id: score}}
        """
        X, Y = [], []
        for item in train_batch:
            dim_texts = [item["dim_texts"][d] for d in dim_order]
            x = self.encode_dim_concat(dim_texts)
            y = np.array([item["scores"][d] for d in dim_order], dtype=np.float32).reshape(1, -1)
            X.append(x)
            Y.append(y)
        X = np.vstack(X).astype(np.float32)
        Y = np.vstack(Y).astype(np.float32)

        emb_size = X.shape[1]
        self._init_model(emb_size)
        opt = torch.optim.AdamW(self.model.parameters(), lr=lr)
        mse = nn.MSELoss()

        Xt = torch.from_numpy(X).to(DEVICE)
        Yt = torch.from_numpy(Y).to(DEVICE)

        for _ in range(epochs):
            self.model.train()
            mu, logvar = self.model(Xt)
            # only supervise mu with MSE; logvar learns uncertainty
            loss = mse(mu, Yt)
            opt.zero_grad(); loss.backward(); opt.step()

        torch.save({"state_dict": self.model.state_dict(), "emb_size": emb_size, "num_dims": self.num_dims}, PRIOR_MODEL_PATH)

    def load(self):
        ckpt = torch.load(PRIOR_MODEL_PATH, map_location=DEVICE)
        self._init_model(ckpt["emb_size"])
        self.model.load_state_dict(ckpt["state_dict"])

    def predict(self, dim_texts: List[str]) -> Tuple[np.ndarray, np.ndarray]:
        self.model.eval()
        x = self.encode_dim_concat(dim_texts).astype(np.float32)
        xt = torch.from_numpy(x).to(DEVICE)
        with torch.no_grad():
            mu, logvar = self.model(xt)
        mu = mu.cpu().numpy()[0]
        sigma = np.exp(0.5 * logvar.cpu().numpy()[0])
        return mu, sigma
