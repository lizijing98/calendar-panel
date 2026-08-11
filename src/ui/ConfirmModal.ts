import { App, Modal, Setting } from "obsidian";

/** 创建日记或周记前使用的通用确认对话框。 */
export class ConfirmCreateModal extends Modal {
  constructor(
    app: App,
    /** 对话框标题。 */
    private readonly titleText: string,
    /** 对创建行为的提示说明。 */
    private readonly description: string,
    /** 取消按钮文案。 */
    private readonly cancelText: string,
    /** 确认按钮文案。 */
    private readonly confirmText: string,
    /** 用户确认后执行的异步创建操作。 */
    private readonly onConfirm: () => Promise<void>,
  ) {
    super(app);
  }

  onOpen(): void {
    this.setTitle(this.titleText);
    this.contentEl.createEl("p", { text: this.description });
    new Setting(this.contentEl)
      .addButton((button) =>
        button.setButtonText(this.cancelText).onClick(() => this.close()),
      )
      .addButton((button) =>
        button
          .setButtonText(this.confirmText)
          .setCta()
          .onClick(async () => {
            await this.onConfirm();
            this.close();
          }),
      );
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
