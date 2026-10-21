function safeFileName(name) {
  return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Download the chat as a plain text file. */
export function exportChatAsTxt(chatName, messages) {
  let content = `=====================================================\n`;
  content += `NLPChat Export: ${chatName}\n`;
  content += `Export Date: ${new Date().toLocaleString()}\n`;
  content += `Total Messages: ${messages.length}\n`;
  content += `=====================================================\n\n`;

  for (const m of messages) {
    const time = new Date(m.created_at).toLocaleString();
    const sender = m.sender_name || 'User';
    content += `[${time}] ${sender}: ${m.normalized_content}\n`;
  }

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeFileName(chatName)}_export.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Open a print-friendly version of the chat. The browser can save it as PDF. */
export function exportChatAsPdf(chatName, messages) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const safeChatName = escapeHtml(chatName);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>NLPChat - ${safeChatName}</title>
        <style>
          body { font-family: -apple-system, sans-serif; padding: 24px; color: #111; max-width: 800px; margin: 0 auto; }
          .header { border-bottom: 2px solid #00A884; padding-bottom: 12px; margin-bottom: 24px; }
          .title { font-size: 22px; font-weight: bold; color: #008069; }
          .meta { font-size: 13px; color: #666; margin-top: 4px; }
          .message { margin-bottom: 14px; padding: 10px 14px; border-radius: 8px; background: #f4f6f8; font-size: 14px; }
          .sender { font-weight: bold; color: #008069; margin-bottom: 4px; font-size: 13px; }
          .time { font-size: 11px; color: #888; float: right; }
          .text { line-height: 1.4; color: #222; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">NLPChat: ${safeChatName}</div>
          <div class="meta">Exported on ${new Date().toLocaleString()} • ${messages.length} messages</div>
        </div>
        ${messages.map(m => `
          <div class="message">
            <div class="sender">
              ${escapeHtml(m.sender_name || 'User')}
              <span class="time">${new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div class="text">${escapeHtml(m.normalized_content)}</div>
          </div>
        `).join('')}
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 300);
}
