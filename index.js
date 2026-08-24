// ============================================================
// 聊天记录导出TXT - SillyTavern 扩展 (客户端)
// v1.8.1
// 浏览器下载，简洁设置面板
// ============================================================

import { getContext } from "../../../extensions.js";

const EXT = "chat-export-txt";
const TITLE = "聊天记录导出TXT";
const LS_KEY = "chat_export_txt_settings";

const DEFAULTS = {
    userName: "",
    charName: "",
    skipSystem: true,
    blankLine: true,
    dateMode: "all",
    lastNDays: 3,
    startDate: "",
    endDate: "",
    customFilename: "",
};

// ============================================================
// 设置读写
// ============================================================

function getSettings() {
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            for (const k of Object.keys(DEFAULTS)) {
                if (parsed[k] === undefined) parsed[k] = DEFAULTS[k];
            }
            return parsed;
        }
    } catch (e) {}
    return { ...DEFAULTS };
}

function saveSettings(s) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch (e) {}
}

// ============================================================
// 工具函数
// ============================================================

function parseDate(sendDate) {
    if (!sendDate) return null;
    if (typeof sendDate === "number" || /^\d+$/.test(String(sendDate).trim())) {
        const ts = Number(sendDate);
        return new Date(ts > 1e12 ? ts : ts * 1000);
    }
    const d = new Date(sendDate);
    return isNaN(d.getTime()) ? null : d;
}

function fmtTS(date) {
    if (!date) return "";
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")} ${String(date.getHours()).padStart(2,"0")}:${String(date.getMinutes()).padStart(2,"0")}`;
}

function fmtDate(date) {
    if (!date) return "";
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}

function inRange(msg, s) {
    if (s.dateMode === "all") return true;
    const d = parseDate(msg.send_date);
    if (!d) return true;
    const ds = fmtDate(d);
    if (s.dateMode === "lastNDays") {
        const cut = new Date();
        cut.setDate(cut.getDate() - (Number(s.lastNDays) || 3));
        return ds >= fmtDate(cut);
    }
    if (s.dateMode === "range") {
        if (s.startDate && ds < s.startDate) return false;
        if (s.endDate && ds > s.endDate) return false;
    }
    return true;
}

function getCharName() {
    const ctx = getContext();
    if (ctx.characters && ctx.characterId !== undefined) {
        const c = ctx.characters[ctx.characterId];
        if (c && c.name) return c.name;
    }
    return "聊天记录";
}

function getFilename() {
    const s = getSettings();
    const custom = (s.customFilename || "").trim();
    if (custom) {
        return custom.endsWith(".txt") ? custom : custom + ".txt";
    }
    return `${getCharName()}.txt`;
}

// ============================================================
// 去除格式符号
// ============================================================

function stripMarkdown(text) {
    if (!text) return "";
    let t = text;
    t = t.replace(/\*\*(.+?)\*\*/g, "$1");
    t = t.replace(/\*(.+?)\*/g, "$1");
    t = t.replace(/__(.+?)__/g, "$1");
    t = t.replace(/~~(.+?)~~/g, "$1");
    t = t.replace(/^#{1,6}\s+/gm, "");
    t = t.replace(/`(.+?)`/g, "$1");
    t = t.replace(/```[\s\S]*?```/g, "");
    t = t.replace(/^[\s]*[-*+]\s+/gm, "");
    t = t.replace(/^[\s]*\d+\.\s+/gm, "");
    t = t.replace(/^>\s*/gm, "");
    t = t.replace(/^[-*_]{3,}\s*$/gm, "");
    t = t.replace(/\[(.+?)\]\(.+?\)/g, "$1");
    t = t.replace(/!\[.*?\]\(.+?\)/g, "");
    t = t.replace(/\n{3,}/g, "\n\n");
    return t.trim();
}

// ============================================================
// 导出 — 浏览器直接下载
// ============================================================

async function doExport() {
    try {
        const ctx = getContext();
        const chat = ctx.chat;
        if (!chat || !chat.length) {
            toastr.warning("当前聊天记录为空", TITLE);
            return;
        }
        const s = getSettings();
        const me = (s.userName || "").trim();
        const cn = (s.charName || "").trim();
        let cnt = 0, skipSys = 0, skipDate = 0;
        const lines = [];
        for (const m of chat) {
            if (s.skipSystem && m.is_system) { skipSys++; continue; }
            if (!inRange(m, s)) { skipDate++; continue; }
            cnt++;
            let name = m.name;
            if (m.is_user) {
                if (me) name = me;
            } else {
                if (cn) name = cn;
                if (!name) name = "角色";
            }
            const ts = fmtTS(parseDate(m.send_date));
            if (ts) lines.push(ts);
            const content = stripMarkdown(m.mes || "");
            lines.push(`${name}：${content}`);
            if (s.blankLine) lines.push("");
        }
        while (lines.length && lines[lines.length-1] === "") lines.pop();
        const text = lines.join("\n");
        const fn = getFilename();

        // 浏览器下载
        const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = fn; a.style.display = "none";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);

        let msg = `已导出 ${cnt} 条消息`;
        if (skipDate > 0) msg += `（日期筛选跳过 ${skipDate} 条）`;
        if (skipSys > 0) msg += `（跳过 ${skipSys} 条系统消息）`;
        toastr.success(msg, TITLE, { timeOut: 5000 });
    } catch (e) {
        console.error(`[${EXT}] 导出异常:`, e);
        toastr.error("导出失败: " + e.message, TITLE);
    }
}

// ============================================================
// 日期输入框
// ============================================================

function autoFormatDateInput(inputEl) {
    let val = inputEl.value.replace(/[^0-9]/g, "");
    if (val.length >= 8) {
        val = val.slice(0, 8);
        inputEl.value = `${val.slice(0,4)}-${val.slice(4,6)}-${val.slice(6,8)}`;
    }
}

// ============================================================
// 设置面板
// ============================================================

function buildPanel() {
    if ($(`#${EXT}_settings`).length) return;
    const s = getSettings();
    const today = fmtDate(new Date());
    const d3 = new Date(); d3.setDate(d3.getDate()-3);
    const ds = fmtDate(d3);

    const html = `
<div id="${EXT}_settings" class="${EXT}_settings">
<div class="inline-drawer">
<div class="inline-drawer-toggle inline-drawer-header">
<b>${TITLE}</b>
<div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
</div>
<div class="inline-drawer-content">
<div style="padding:10px;">

<div class="chat_export_txt_desc">
一键导出聊天记录为 TXT，带时间戳。
</div>

<div class="chat_export_txt_separator"></div>

<div class="chat_export_txt_section_label">显示名称</div>

<div class="chat_export_txt_row">
<label style="white-space:nowrap;min-width:70px;">用户名称</label>
<input id="${EXT}_user_name" type="text" class="text_pole" value="${s.userName||""}" maxlength="20" style="width:100px;" placeholder="留空使用默认"/>
</div>

<div class="chat_export_txt_row">
<label style="white-space:nowrap;min-width:70px;">角色名称</label>
<input id="${EXT}_char_name" type="text" class="text_pole" value="${s.charName||""}" maxlength="20" style="width:100px;" placeholder="留空使用角色原名"/>
</div>

<div class="chat_export_txt_separator"></div>

<div class="chat_export_txt_section_label">消息选项</div>

<div class="chat_export_txt_row">
<label class="checkbox_label"><input id="${EXT}_skip_system" type="checkbox" ${s.skipSystem?"checked":""}/> 跳过系统消息</label>
</div>
<div class="chat_export_txt_row">
<label class="checkbox_label"><input id="${EXT}_blank_line" type="checkbox" ${s.blankLine?"checked":""}/> 消息之间留空行</label>
</div>

<div class="chat_export_txt_separator"></div>

<div class="chat_export_txt_section_label">日期筛选</div>

<div class="chat_export_txt_row">
<label style="cursor:pointer;display:inline-flex;align-items:center;gap:4px;">
<input type="radio" name="${EXT}_date_mode" value="all" ${s.dateMode==="all"?"checked":""}/> 全部消息
</label>
</div>
<div class="chat_export_txt_row">
<label style="cursor:pointer;display:inline-flex;align-items:center;gap:4px;">
<input type="radio" name="${EXT}_date_mode" value="lastNDays" ${s.dateMode==="lastNDays"?"checked":""}/> 最近
</label>
<input id="${EXT}_last_n" type="number" class="text_pole" value="${s.lastNDays||3}" min="1" max="365" style="width:60px;text-align:center;"/>
<label>天</label>
</div>
<div class="chat_export_txt_row">
<label style="cursor:pointer;display:inline-flex;align-items:center;gap:4px;">
<input type="radio" name="${EXT}_date_mode" value="range" ${s.dateMode==="range"?"checked":""}/> 自定义范围
</label>
</div>
<div style="margin:8px 0;padding-left:24px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
<label>从</label>
<input id="${EXT}_start_date" type="text" class="text_pole" inputmode="numeric" value="${s.startDate||ds}" placeholder="YYYY-MM-DD" maxlength="10" style="width:140px;min-width:140px;font-family:monospace;"/>
<label>到</label>
<input id="${EXT}_end_date" type="text" class="text_pole" inputmode="numeric" value="${s.endDate||today}" placeholder="YYYY-MM-DD" maxlength="10" style="width:140px;min-width:140px;font-family:monospace;"/>
</div>
<div style="margin:4px 0 4px 24px;font-size:11px;color:var(--text-muted);">
直接输入日期，格式：YYYY-MM-DD（如 2026-08-22）
</div>

<div class="chat_export_txt_separator"></div>

<div class="chat_export_txt_section_label">文件名</div>

<div class="chat_export_txt_row">
<input id="${EXT}_custom_fn" type="text" class="text_pole" value="${s.customFilename||""}" placeholder="留空自动使用角色名.txt" style="width:240px;"/>
</div>
<div class="chat_export_txt_hint">
留空则自动使用角色名作为文件名。
</div>

<div class="chat_export_txt_separator"></div>

<div style="margin-top:4px;display:flex;gap:8px;flex-wrap:wrap;">
<button id="${EXT}_export_btn" class="chat_export_txt_btn" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;padding:8px 18px;background:#1a6fb5;color:#fff;border:none;border-radius:4px;font-size:14px;font-weight:600;white-space:nowrap;">
<i class="fa-solid fa-file-export"></i> 导出为 TXT
</button>
</div>

</div></div></div></div>`;

    let placed = false;
    for (const sel of ["#extensions_settings", "#extensions_settings2", "#extensions_settings3"]) {
        const $el = $(sel);
        if ($el.length) {
            $el.append(html);
            placed = true;
            console.log(`[${EXT}] 面板已注入到 ${sel}`);
            break;
        }
    }
    if (!placed) { console.warn(`[${EXT}] 未找到扩展设置容器，稍后重试...`); return false; }

    // ---- 绑定事件 ----

    $(`#${EXT}_export_btn`).on("click", doExport);

    $(`#${EXT}_user_name`).on("change", function () {
        const s = getSettings(); s.userName = $(this).val(); saveSettings(s);
    });
    $(`#${EXT}_char_name`).on("change", function () {
        const s = getSettings(); s.charName = $(this).val(); saveSettings(s);
    });
    $(`#${EXT}_skip_system`).on("change", function () {
        const s = getSettings(); s.skipSystem = $(this).is(":checked"); saveSettings(s);
    });
    $(`#${EXT}_blank_line`).on("change", function () {
        const s = getSettings(); s.blankLine = $(this).is(":checked"); saveSettings(s);
    });
    $(`input[name="${EXT}_date_mode"]`).on("change", function () {
        const s = getSettings(); s.dateMode = $(this).val(); saveSettings(s);
    });
    $(`#${EXT}_last_n`).on("change", function () {
        const v = Math.max(1, Math.min(365, Number($(this).val()) || 3));
        $(this).val(v);
        const s = getSettings(); s.lastNDays = v; saveSettings(s);
    });

    $(`#${EXT}_start_date, #${EXT}_end_date`).on("input", function () {
        autoFormatDateInput(this);
    });
    $(`#${EXT}_start_date`).on("change", function () {
        const s = getSettings(); s.startDate = $(this).val(); saveSettings(s);
    });
    $(`#${EXT}_end_date`).on("change", function () {
        const s = getSettings(); s.endDate = $(this).val(); saveSettings(s);
    });

    $(`#${EXT}_custom_fn`).on("change", function () {
        const s = getSettings(); s.customFilename = $(this).val(); saveSettings(s);
    });

    console.log(`[${EXT}] 设置面板构建完成 ✓`);
    return true;
}

// ============================================================
// 扩展菜单
// ============================================================

function addMenu() {
    if ($(`#${EXT}_quick`).length) return;
    const html = `<div id="${EXT}_quick" class="list-group-item flex-container flexGap5"><div class="fa-container fa-solid fa-file-export"></div><span>导出聊天为 TXT</span></div>`;
    $("#extensionsMenu").append(html);
    $(`#${EXT}_quick`).on("click", doExport);
}

// ============================================================
// 入口
// ============================================================

jQuery(() => {
    console.log(`[${EXT}] 插件启动...`);

    const observer = new MutationObserver(() => {
        if (!$(`#${EXT}_settings`).length) {
            if (buildPanel()) observer.disconnect();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    let tries = 0;
    const poll = setInterval(() => {
        tries++;
        if ($(`#${EXT}_settings`).length) { clearInterval(poll); return; }
        if (buildPanel() || tries > 60) clearInterval(poll);
    }, 1000);

    const menuPoll = setInterval(() => {
        if ($("#extensionsMenu").length) { addMenu(); clearInterval(menuPoll); }
    }, 1000);

    console.log(`[${EXT}] 插件已加载`);
});