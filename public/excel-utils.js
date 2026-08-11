/* 为 SheetJS 生成的工作簿补充 Excel 数据验证（下拉列表）。 */
async function workbookDownloadWithValidation(workbook, filename, cellRange, optionRange) {
  if (typeof XLSX === 'undefined') throw new Error('Excel 组件未加载');
  if (typeof JSZip === 'undefined' || !cellRange || !optionRange) {
    XLSX.writeFile(workbook, filename);
    UI.toast('文件已生成');
    return;
  }
  const bytes = XLSX.write(workbook, { bookType:'xlsx', type:'array' });
  const zip = await JSZip.loadAsync(bytes);
  const path = 'xl/worksheets/sheet1.xml';
  const part = zip.file(path);
  if (!part) throw new Error('无法生成 Excel 模板');
  let xml = await part.async('text');
  const formula = optionRange.includes("!") ? `INDIRECT(&quot;${optionRange}&quot;)` : optionRange;
  const validation = `<dataValidations count="1"><dataValidation type="list" allowBlank="1" showErrorMessage="1" errorTitle="无效科目" error="请从下拉列表选择科目" sqref="${cellRange}"><formula1>${formula}</formula1></dataValidation></dataValidations>`;
  xml = xml.includes('<pageMargins') ? xml.replace('<pageMargins', validation + '<pageMargins') : xml.replace('</worksheet>', validation + '</worksheet>');
  zip.file(path, xml);
  const blob = await zip.generateAsync({ type:'blob', mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  UI.toast('带科目下拉选项的模板已生成');
}
