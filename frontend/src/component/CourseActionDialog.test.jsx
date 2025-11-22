import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CourseActionDialog from "./course-action";

jest.mock("@mui/material/ButtonBase/TouchRipple", () => ({
  __esModule: true,
  default: () => null,
}));


const baseCourse = {
  code: "COMP3900",
  title: "Capstone",
  year_term: "2024 Term 3",
};

const renderDialog = (props = {}) =>
  render(
    <CourseActionDialog
      open
      course={baseCourse}
      onClose={jest.fn()}
      onUpload={jest.fn()}
      onView={jest.fn()}
      viewStatus={{ aiCompleted: false, loading: false }}
      {...props}
    />
  );

describe("CourseActionDialog", () => {
  test("shows course details and calls onUpload", async () => {
    const onUpload = jest.fn();
    renderDialog({ onUpload });

    expect(
      screen.getByText(/2024 Term 3 COMP3900 Capstone/i)
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: /upload an assignment/i })
    );
    expect(onUpload).toHaveBeenCalled();
  });

  test("enables View button once AI completed and fires handler", async () => {
    const onView = jest.fn();
    renderDialog({
      onView,
      viewStatus: { aiCompleted: true, loading: false },
    });

    const viewBtn = screen.getByRole("button", {
      name: /view ai-generated grades/i,
    });
    expect(viewBtn).toBeEnabled();

    await userEvent.click(viewBtn);
    expect(onView).toHaveBeenCalled();
  });
});
