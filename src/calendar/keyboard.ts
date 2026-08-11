/**
 * 为使用 role="button" 的非 button 元素补齐原生按钮的键盘激活行为。
 * 仅响应 Enter 和空格，并阻止空格触发页面滚动。
 */
export function activateOnKeyboard(
  event: KeyboardEvent,
  action: () => void,
): void {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }
  event.preventDefault();
  action();
}
