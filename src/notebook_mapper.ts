import {Notebook, NotebookPanel} from "@jupyterlab/notebook";
import {Cell} from "@jupyterlab/cells";
import {CodeMirrorEditor} from "@jupyterlab/codemirror";
import CodeMirror = require("codemirror");
import { ShowHintOptions } from "codemirror";
import {CodeEditor} from "@jupyterlab/codeeditor";

interface ICellTransform {
  editor: CodeMirror.Editor,
  line_shift: number;
}

// @ts-ignore
class DocDispatcher implements CodeMirror.Doc {

  notebook_map: NotebookAsSingleEditor;

  constructor(notebook_map: NotebookAsSingleEditor) {
    // TODO
    this.notebook_map = notebook_map
  }

  markText(from: CodeMirror.Position, to: CodeMirror.Position, options?: CodeMirror.TextMarkerOptions): CodeMirror.TextMarker {
    // TODO: edgecase: from and to in different cells
    let editor = this.notebook_map.get_editor_at(from);
    return editor.getDoc().markText(this.notebook_map.transform(from), this.notebook_map.transform(to), options);
  }

  getValue(seperator?: string): string {
    return this.notebook_map.getValue();
  }

  getCursor(start?: string): CodeMirror.Position {
    let active_editor = this.notebook_map.notebook.activeCell.editor as CodeMirrorEditor;
    return active_editor.editor.getDoc().getCursor(start);
  }


}

// TODO: use proxy, as in https://stackoverflow.com/questions/51865430/typescript-compiler-does-not-know-about-es6-proxy-trap-on-class ?
// TODO: make all un-implemented methods issue a warning to a console for improved diagnostics
//  or just remove them altogether and suppress with ts-ignore so it will be more obvious what is implemented and what is not
//  ideally there would be some kind of a construct which defines a subset of CodeMirror.Editor (Interface?) needed for the adapter
export class NotebookAsSingleEditor implements CodeMirror.Editor {
  notebook: Notebook;
  notebook_panel: NotebookPanel;
  line_cell_map: Map<number, ICellTransform>;
  cell_line_map: Map<Cell, number>;
  cm_editor_to_ieditor: Map<CodeMirror.Editor, CodeEditor.IEditor>;

  constructor(notebook_panel: NotebookPanel) {
    this.notebook_panel = notebook_panel;
    this.notebook = notebook_panel.content;
    this.line_cell_map = new Map();
    this.cell_line_map = new Map();
    this.cm_editor_to_ieditor = new Map();
  }

  showHint: (options: ShowHintOptions) => void;
  state: any;

  addKeyMap(map: string | CodeMirror.KeyMap, bottom?: boolean): void {
  }

  addLineClass(line: any, where: string, _class_: string): CodeMirror.LineHandle {
    return undefined;
  }

  addLineWidget(line: any, node: HTMLElement, options?: CodeMirror.LineWidgetOptions): CodeMirror.LineWidget {
    return undefined;
  }

  addOverlay(mode: any, options?: any): void {
    for (let cell of this.notebook.widgets) {
      // TODO: use some more intelligent strategy to determine editors to test
      let cm_editor = cell.editor as CodeMirrorEditor;
      cm_editor.editor.addOverlay(mode, options);
    }
  }

  // @ts-ignore
  addPanel(node: HTMLElement, options?: CodeMirror.ShowPanelOptions): CodeMirror.Panel {
    return undefined;
  }

  addWidget(pos: CodeMirror.Position, node: HTMLElement, scrollIntoView: boolean): void {
  }

  // @ts-ignore
  blockComment(from: Position, to: Position, options?: CodeMirror.CommentOptions): void {
  }

  charCoords(pos: CodeMirror.Position, mode?: "window" | "page" | "local"): { left: number; right: number; top: number; bottom: number } {
    try {
      let editor = this.get_editor_at(pos);
      return editor.charCoords(pos, mode);
    } catch (e) {
      console.log(e)
      return {bottom: 0, left: 0, right: 0, top: 0};
    }
  }

  clearGutter(gutterID: string): void {
  }

  coordsChar(object: { left: number; top: number }, mode?: "window" | "page" | "local"): CodeMirror.Position {
    for (let cell of this.notebook.widgets) {
      // TODO: use some more intelligent strategy to determine editors to test
      let cm_editor = cell.editor as CodeMirrorEditor;
      let pos = cm_editor.editor.coordsChar(object, mode);

      // @ts-ignore
      if (pos.outside === true) {
        continue
      }
      // TODO: if cell is not known, refresh; also, worth fundung why not working now anyway
      let shift = this.cell_line_map.get(cell);
      if (shift === undefined)
        throw Error('Cell not found in cell_line_map')
      return {
        ...pos,
        line: pos.line + shift
      };
    }
  }

  cursorCoords(where?: boolean, mode?: "window" | "page" | "local"): { left: number; top: number; bottom: number };
  cursorCoords(where?: CodeMirror.Position | null, mode?: "window" | "page" | "local"): { left: number; top: number; bottom: number };
  cursorCoords(where?: boolean | CodeMirror.Position | null, mode?: "window" | "page" | "local"): { left: number; top: number; bottom: number } {

    if (typeof where !== "boolean") {
      let editor = this.get_editor_at(where);
      return editor.cursorCoords(this.transform(where));
    }
    return {bottom: 0, left: 0, top: 0};
  }

  defaultCharWidth(): number {
    return (this.notebook.widgets[0].editor as CodeMirrorEditor).editor.defaultCharWidth();
  }

  defaultTextHeight(): number {
    return (this.notebook.widgets[0].editor as CodeMirrorEditor).editor.defaultTextHeight();
  }

  endOperation(): void {
    for (let cell of this.notebook.widgets) {
      let cm_editor = cell.editor as CodeMirrorEditor;
      cm_editor.editor.endOperation()
    }
  }

  execCommand(name: string): void {
    for (let cell of this.notebook.widgets) {
      let cm_editor = cell.editor as CodeMirrorEditor;
      cm_editor.editor.execCommand(name)
    }

  }

  findPosH(start: CodeMirror.Position, amount: number, unit: string, visually: boolean): { line: number; ch: number; hitSide?: boolean } {
    return {ch: 0, line: 0};
  }

  findPosV(start: CodeMirror.Position, amount: number, unit: string): { line: number; ch: number; hitSide?: boolean } {
    return {ch: 0, line: 0};
  }

  findWordAt(pos: CodeMirror.Position): CodeMirror.Range {
    return undefined;
  }

  focus(): void {
  }

  getDoc(): CodeMirror.Doc {
    let dummy_doc = new DocDispatcher(this);
    // @ts-ignore
    return dummy_doc;
  }

  getGutterElement(): HTMLElement {
    return undefined;
  }

  getInputField(): HTMLTextAreaElement {
    return undefined;
  }

  getLineTokens(line: number, precise?: boolean): CodeMirror.Token[] {
    return [];
  }

  getModeAt(pos: CodeMirror.Position): any {
  }

  getOption(option: string): any {
  }

  getScrollInfo(): CodeMirror.ScrollInfo {
    return undefined;
  }

  getScrollerElement(): HTMLElement {
    return undefined;
  }

  getStateAfter(line?: number): any {
  }

  getTokenAt(pos: CodeMirror.Position, precise?: boolean): CodeMirror.Token {
    if(pos === undefined)
      return;
    let editor = this.get_editor_at(pos);
    return editor.getTokenAt(this.transform(pos));
  }

  getTokenTypeAt(pos: CodeMirror.Position): string {
    let editor = this.get_editor_at(pos);
    return editor.getTokenTypeAt(this.transform(pos));
  }

  // TODO: make a mapper class, with mapping function only
  get_editor_at(pos: CodeMirror.Position) {
    return this.line_cell_map.get(pos.line).editor
  }

  transform(pos: CodeMirror.Position): CodeMirror.Position {
    return {
      ...pos,
      // DOES it work like that? TODO
      line: pos.line - this.line_cell_map.get(pos.line).line_shift,
    }
  }

  getValue(seperator?: string): string {
    let value = '';
    this.line_cell_map.clear();
    this.cell_line_map.clear();
    this.cm_editor_to_ieditor.clear();

    let last_line = 0;
    this.notebook.widgets.every((cell) => {
      let codemirror_editor = cell.editor as CodeMirrorEditor;
      let cm_editor = codemirror_editor.editor;
      this.cm_editor_to_ieditor.set(cm_editor, cell.editor);

      if (cell.model.type == 'code') {
        let lines = cm_editor.getValue(seperator);
        // TODO: use blacklist for cells with foreign language code
        //  TODO: have a second LSP for foreign language!
        if (lines.startsWith('%%'))
          return true;
        // TODO one line is necessary, next two lines are to silence linters - ideally this would be configurable
        value += lines + '\n' + '\n\n';
        let cell_lines = lines.split('\n').length;
        this.cell_line_map.set(cell, last_line);
        for (let i = 0; i < cell_lines; i++) {
          // TODO: use better structure (tree with ranges?)
          this.line_cell_map.set(
            last_line + i, {editor: cm_editor, line_shift: last_line}
          )
        }
        // definitely works without it
        last_line += cell_lines + 2
      }
      return true;
    });

    return value;
  }

  getViewport(): { from: number; to: number } {
    return {from: 0, to: 0};
  }

  getWrapperElement(): HTMLElement {
    return this.notebook_panel.node;
  }

  hasFocus(): boolean {
    return false;
  }

  heightAtLine(line: any, mode?: "window" | "page" | "local", includeWidgets?: boolean): number {
    return 0;
  }

  indentLine(line: number, dir?: string): void {
  }

  isReadOnly(): boolean {
    return false;
  }

  lineAtHeight(height: number, mode?: "window" | "page" | "local"): number {
    return 0;
  }

  // @ts-ignore
  lineComment(from: Position, to: Position, options?: CodeMirror.CommentOptions): void {
  }

  lineInfo(line: any): { line: any; handle: any; text: string; gutterMarkers: any; textClass: string; bgClass: string; wrapClass: string; widgets: any } {
    return {
      bgClass: "", gutterMarkers: undefined, handle: undefined,
      line: undefined, text: "", textClass: "", widgets: undefined,
      wrapClass: ""
    };
  }

  off(eventName: string, handler: (instance: CodeMirror.Editor) => void): void;
  off(eventName: "change", handler: (instance: CodeMirror.Editor, change: CodeMirror.EditorChangeLinkedList) => void): void;
  off(eventName: "changes", handler: (instance: CodeMirror.Editor, change: CodeMirror.EditorChangeLinkedList[]) => void): void;
  off(eventName: "beforeChange", handler: (instance: CodeMirror.Editor, change: CodeMirror.EditorChangeCancellable) => void): void;
  off(eventName: "cursorActivity", handler: (instance: CodeMirror.Editor) => void): void;
  off(eventName: "beforeSelectionChange", handler: (instance: CodeMirror.Editor, selection: { head: CodeMirror.Position; anchor: CodeMirror.Position }) => void): void;
  off(eventName: "viewportChange", handler: (instance: CodeMirror.Editor, from: number, to: number) => void): void;
  off(eventName: "gutterClick", handler: (instance: CodeMirror.Editor, line: number, gutter: string, clickEvent: Event) => void): void;
  off(eventName: "focus", handler: (instance: CodeMirror.Editor) => void): void;
  off(eventName: "blur", handler: (instance: CodeMirror.Editor) => void): void;
  off(eventName: "scroll", handler: (instance: CodeMirror.Editor) => void): void;
  off(eventName: "update", handler: (instance: CodeMirror.Editor) => void): void;
  off(eventName: "renderLine", handler: (instance: CodeMirror.Editor, line: CodeMirror.LineHandle, element: HTMLElement) => void): void;
  off(eventName: "mousedown" | "dblclick" | "touchstart" | "contextmenu" | "keydown" | "keypress" | "keyup" | "cut" | "copy" | "paste" | "dragstart" | "dragenter" | "dragover" | "dragleave" | "drop", handler: (instance: CodeMirror.Editor, event: Event) => void): void;
  off(eventName: string, handler: (doc: CodeMirror.Doc, event: any) => void): void;
  off(eventName: string | "change" | "changes" | "beforeChange" | "cursorActivity" | "beforeSelectionChange" | "viewportChange" | "gutterClick" | "focus" | "blur" | "scroll" | "update" | "renderLine" | CodeMirror.DOMEvent, handler: ((instance: CodeMirror.Editor) => void) | ((instance: CodeMirror.Editor, change: CodeMirror.EditorChangeLinkedList) => void) | ((instance: CodeMirror.Editor, change: CodeMirror.EditorChangeLinkedList[]) => void) | ((instance: CodeMirror.Editor, change: CodeMirror.EditorChangeCancellable) => void) | ((instance: CodeMirror.Editor, selection: { head: CodeMirror.Position; anchor: CodeMirror.Position }) => void) | ((instance: CodeMirror.Editor, from: number, to: number) => void) | ((instance: CodeMirror.Editor, line: number, gutter: string, clickEvent: Event) => void) | ((instance: CodeMirror.Editor, line: CodeMirror.LineHandle, element: HTMLElement) => void) | ((instance: CodeMirror.Editor, event: Event) => void) | ((doc: CodeMirror.Doc, event: any) => void)): void {
  }

  on(eventName: string, handler: (instance: CodeMirror.Editor) => void): void;
  on(eventName: "change", handler: (instance: CodeMirror.Editor, change: CodeMirror.EditorChangeLinkedList) => void): void;
  on(eventName: "changes", handler: (instance: CodeMirror.Editor, change: CodeMirror.EditorChangeLinkedList[]) => void): void;
  on(eventName: "beforeChange", handler: (instance: CodeMirror.Editor, change: CodeMirror.EditorChangeCancellable) => void): void;
  on(eventName: "cursorActivity", handler: (instance: CodeMirror.Editor) => void): void;
  on(eventName: "beforeSelectionChange", handler: (instance: CodeMirror.Editor, selection: { head: CodeMirror.Position; anchor: CodeMirror.Position }) => void): void;
  on(eventName: "viewportChange", handler: (instance: CodeMirror.Editor, from: number, to: number) => void): void;
  on(eventName: "gutterClick", handler: (instance: CodeMirror.Editor, line: number, gutter: string, clickEvent: Event) => void): void;
  on(eventName: "focus", handler: (instance: CodeMirror.Editor) => void): void;
  on(eventName: "blur", handler: (instance: CodeMirror.Editor) => void): void;
  on(eventName: "scroll", handler: (instance: CodeMirror.Editor) => void): void;
  on(eventName: "update", handler: (instance: CodeMirror.Editor) => void): void;
  on(eventName: "renderLine", handler: (instance: CodeMirror.Editor, line: CodeMirror.LineHandle, element: HTMLElement) => void): void;
  on(eventName: "mousedown" | "dblclick" | "touchstart" | "contextmenu" | "keydown" | "keypress" | "keyup" | "cut" | "copy" | "paste" | "dragstart" | "dragenter" | "dragover" | "dragleave" | "drop", handler: (instance: CodeMirror.Editor, event: Event) => void): void;
  on(eventName: "overwriteToggle", handler: (instance: CodeMirror.Editor, overwrite: boolean) => void): void;
  on(eventName: string, handler: (doc: CodeMirror.Doc, event: any) => void): void;
  on(eventName: string | "change" | "changes" | "beforeChange" | "cursorActivity" | "beforeSelectionChange" | "viewportChange" | "gutterClick" | "focus" | "blur" | "scroll" | "update" | "renderLine" | CodeMirror.DOMEvent | "overwriteToggle", handler: ((instance: CodeMirror.Editor) => void) | ((instance: CodeMirror.Editor, change: CodeMirror.EditorChangeLinkedList) => void) | ((instance: CodeMirror.Editor, change: CodeMirror.EditorChangeLinkedList[]) => void) | ((instance: CodeMirror.Editor, change: CodeMirror.EditorChangeCancellable) => void) | ((instance: CodeMirror.Editor, selection: { head: CodeMirror.Position; anchor: CodeMirror.Position }) => void) | ((instance: CodeMirror.Editor, from: number, to: number) => void) | ((instance: CodeMirror.Editor, line: number, gutter: string, clickEvent: Event) => void) | ((instance: CodeMirror.Editor, line: CodeMirror.LineHandle, element: HTMLElement) => void) | ((instance: CodeMirror.Editor, event: Event) => void) | ((instance: CodeMirror.Editor, overwrite: boolean) => void) | ((doc: CodeMirror.Doc, event: any) => void)): void {

    for (let cell of this.notebook.widgets) {
      // TODO: use some more intelligent strategy to determine editors to test
      let cm_editor = cell.editor as CodeMirrorEditor;
      // TODO: wrap the handler
      // @ts-ignore
      return cm_editor.editor.on(eventName, handler);
    }
  }

  operation<T>(fn: () => T): T {
    return undefined;
  }

  refresh(): void {
  }

  removeKeyMap(map: string | CodeMirror.KeyMap): void {
  }

  removeLineClass(line: any, where: string, class_?: string): CodeMirror.LineHandle {
    return undefined;
  }

  removeOverlay(mode: any): void {
  }

  scrollIntoView(pos: CodeMirror.Position | null, margin?: number): void;
  scrollIntoView(pos: { left: number; top: number; right: number; bottom: number }, margin?: number): void;
  scrollIntoView(pos: { line: number; ch: number }, margin?: number): void;
  scrollIntoView(pos: { from: CodeMirror.Position; to: CodeMirror.Position }, margin?: number): void;
  scrollIntoView(pos: CodeMirror.Position | null | { left: number; top: number; right: number; bottom: number } | { line: number; ch: number } | { from: CodeMirror.Position; to: CodeMirror.Position }, margin?: number): void {
  }

  scrollTo(x?: number | null, y?: number | null): void {
  }

  setGutterMarker(line: any, gutterID: string, value: HTMLElement | null): CodeMirror.LineHandle {
    return undefined;
  }

  setOption(option: string, value: any): void {
  }

  setSize(width: any, height: any): void {
  }

  setValue(content: string): void {
  }

  startOperation(): void {
  }

  swapDoc(doc: CodeMirror.Doc): CodeMirror.Doc {
    return undefined;
  }

  // @ts-ignore
  toggleComment(options?: CodeMirror.CommentOptions): void {
  }

  toggleOverwrite(value?: boolean): void {
  }

  triggerOnKeyDown(event: Event): void {
  }

  // @ts-ignore
  uncomment(from: Position, to: Position, options?: CodeMirror.CommentOptions): boolean {
    return false;
  }
}
