import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardStudent from "../src/component/dashboard-1-main";

beforeAll(() => {
  class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  global.ResizeObserver = MockResizeObserver;
});

const baseRow = {
  rowKey: "row-1",
  studentID: "z1234567",
  assignment: "Project 1",
  markBy: "Tutor",
  tutorMark: 70,
  aiMark: 75.123,
  feedback: "Score: 3.5\nSecond line",
  reviewMark: 80,
  reviewComments: "Needs improvement",
};

describe("DashboardStudent", () => {
  test("renders feedback list, review comments, and final mark formatting", () => {
    render(<DashboardStudent rows={[baseRow]} />);

    expect(screen.getByText(/Score: 3.50/i)).toBeInTheDocument();
    expect(screen.getByText(/Second line/i)).toBeInTheDocument();
    expect(screen.getByText(/Needs improvement/i)).toBeInTheDocument();
    expect(screen.getByText("80.00")).toBeInTheDocument();
  });

  test("hides AI justification column for tutor view", () => {
    render(<DashboardStudent rows={[baseRow]} variant="tutorView" />);

    expect(
      screen.queryByRole("columnheader", { name: /AI Justification/i })
    ).not.toBeInTheDocument();
  });

  test("invokes selection callbacks when toggling a row", async () => {
    const onToggleRow = jest.fn();
    const onToggleAll = jest.fn();

    render(
      <DashboardStudent
        rows={[baseRow]}
        selectionConfig={{
          selectedIds: [],
          onToggleRow,
          onToggleAll,
          allSelected: false,
          indeterminate: false,
          disableToggleAll: false,
        }}
      />
    );

    await userEvent.click(screen.getByLabelText(/Select row z1234567/i));
    expect(onToggleRow).toHaveBeenCalledWith("row-1");

    await userEvent.click(screen.getByLabelText(/Select all rows/i));
    expect(onToggleAll).toHaveBeenCalled();
  });
});
