import { Logger } from "../log";

describe("Logger", () => {
  const spyOnConsoleInfo = jest.spyOn(console, "info").mockImplementation();
  const spyOnConsoleWarn = jest.spyOn(console, "warn").mockImplementation();
  const spyOnConsoleError = jest.spyOn(console, "error").mockImplementation();

  afterEach(() => {
    spyOnConsoleError.mockClear();
    spyOnConsoleWarn.mockClear();
    spyOnConsoleInfo.mockClear();
  });

  it("log info", () => {
    Logger.info("Test Info");
    expect(spyOnConsoleInfo).toHaveBeenCalledTimes(1);
    expect(console.info).toBeCalledWith("[scheduler] -", "Test Info");
  });

  it("log warn", () => {
    Logger.warn("Test Warning");
    expect(spyOnConsoleWarn).toHaveBeenCalledTimes(1);
    expect(console.warn).toBeCalledWith("[scheduler] -", "Test Warning");
  });

  it("log error", () => {
    Logger.error("Test Error");
    expect(spyOnConsoleError).toHaveBeenCalledTimes(1);
    expect(console.error).toBeCalledWith("[scheduler] -", "Test Error");
  });
});
