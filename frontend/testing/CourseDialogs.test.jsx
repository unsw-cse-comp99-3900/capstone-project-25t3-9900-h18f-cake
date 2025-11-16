import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, createTheme } from "@mui/material/styles";

import CourseAdd from "../src/component/course-add";
import CourseDelete from "../src/component/course-delete";

const renderWithTheme = (ui) => {
  const theme = createTheme({
    components: {
      MuiButtonBase: {
        defaultProps: {
          disableRipple: true,
        },
      },
    },
  });
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

describe("CourseAdd dialog", () => {
  test("validates mandatory fields before submission", async () => {
    const onAdd = jest.fn();

    renderWithTheme(<CourseAdd open onClose={jest.fn()} onAdd={onAdd} />);

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(screen.getByText(/course code is required/i)).toBeInTheDocument();
    expect(screen.getByText(/course title is required/i)).toBeInTheDocument();
    expect(screen.getByText(/year is required/i)).toBeInTheDocument();
    expect(screen.getByText(/term is required/i)).toBeInTheDocument();
    expect(onAdd).not.toHaveBeenCalled();
  });

  test("normalizes input and calls onAdd with formatted payload", async () => {
    const onAdd = jest.fn();

    renderWithTheme(<CourseAdd open onClose={jest.fn()} onAdd={onAdd} />);

    await userEvent.type(screen.getByLabelText(/course code/i), "COMP1511 ");
    await userEvent.type(screen.getByLabelText(/course title/i), "Programming");
    await userEvent.type(screen.getByLabelText(/year/i), "2025");
    const termInput = screen.getByLabelText(/term/i);
    fireEvent.mouseDown(termInput);
    const listbox = await screen.findByRole("listbox");
    await userEvent.click(within(listbox).getByRole("option", { name: /term 1/i }));

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(onAdd).toHaveBeenCalledWith({
      year_term: "2025 Term 1",
      code: "COMP1511",
      title: "Programming",
    });
  });
});

describe("CourseDelete dialog", () => {
  test("shows selected course details and propagates actions", async () => {
    const onClose = jest.fn();
    const onDelete = jest.fn();

    renderWithTheme(
      <CourseDelete
        open
        onClose={onClose}
        onDelete={onDelete}
        course={{ code: "COMP3900", title: "Capstone" }}
      />
    );

    expect(
      screen.getByText(/delete COMP3900 — Capstone/i)
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(onDelete).toHaveBeenCalled();
  });
});
