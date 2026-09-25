/**
 * Wraps every `<table>` in `container` with a `.docx-table-scroll` div so an
 * oversized table can scroll horizontally as a last resort (see index.css)
 * instead of overflowing the page or forcing every table to a fixed width
 * that would distort narrower ones. Idempotent — safe to call more than once
 * on the same container.
 */
export function wrapDocxTables(container: ParentNode): void {
  container.querySelectorAll("table").forEach((table) => {
    if (table.parentElement?.classList.contains("docx-table-scroll")) return;
    const wrapper = document.createElement("div");
    wrapper.className = "docx-table-scroll";
    table.parentElement?.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });
}
