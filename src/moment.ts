import type momentFactory from "moment";
import { moment as obsidianMoment } from "obsidian";

// Obsidian 的类型声明将 Moment 导出为命名空间，但运行时值同时也是可调用工厂。
// 该类型转换既保留应用侧类型提示，也避免额外打包一份 Moment.js。
export const moment = obsidianMoment as unknown as typeof momentFactory;
