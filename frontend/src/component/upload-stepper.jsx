import React from "react";
import { Box, Stepper, Step, StepLabel } from "@mui/material";

export default function UploadStepper({ activeStep = 0, steps = [] }) {
    return (
        <Box sx={{ my: 2 }}>
            <Stepper activeStep={activeStep} alternativeLabel>
                {steps.map((label) => (
                    <Step key={label}>
                        <StepLabel>{label}</StepLabel>
                    </Step>
                ))}
            </Stepper>
        </Box>
    );
}
