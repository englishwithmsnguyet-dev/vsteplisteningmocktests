// result_report.js - Official VSTEP Listening Result Report Card, Persistent Integrity Tracker & Teacher Results Board
(function (global) {
    'use strict';

    const VIOLATION_STORAGE_KEY = 'vstep_listening_report_violations_v1';
    const RTDB_BASE = 'https://vstep6868-default-rtdb.firebaseio.com';
    let currentReportState = null;

    function escHtml(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function normalizeKey(str) {
        return String(str || '')
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
    }

    function getLoggedInStudent() {
        let name = (sessionStorage.getItem('vstep_student_name') || localStorage.getItem('vstep_student_name') || '').trim();
        let className = (sessionStorage.getItem('vstep_student_class') || localStorage.getItem('vstep_student_class') || '').trim();
        if (!name || !className) {
            try {
                const raw = sessionStorage.getItem('vstep_user_session') || localStorage.getItem('vstep_user_session');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (!name && parsed && parsed.name) name = String(parsed.name).trim();
                    if (!className && parsed && parsed.className) className = String(parsed.className).trim();
                }
            } catch (e) {}
        }
        return {
            name: name || 'Học viên',
            className: className || 'Chưa cập nhật'
        };
    }

    function getViolationKey(testId) {
        const st = getLoggedInStudent();
        const nk = normalizeKey(st.name) || 'guest';
        const ck = normalizeKey(st.className) || 'noclass';
        return `${ck}__${nk}__listening_test_${parseInt(testId, 10) || 0}`;
    }

    function readViolationMap() {
        try {
            const raw = localStorage.getItem(VIOLATION_STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    function writeViolationMap(map) {
        try {
            localStorage.setItem(VIOLATION_STORAGE_KEY, JSON.stringify(map));
        } catch (e) {}
    }

    function getViolations(testId) {
        const key = getViolationKey(testId);
        const map = readViolationMap();
        const rec = map[key] || {};
        return {
            tabSwitches: parseInt(rec.tabSwitches || 0, 10) || 0,
            rapidClicks: parseInt(rec.rapidClicks || 0, 10) || 0,
            noAudioClicks: parseInt(rec.noAudioClicks || 0, 10) || 0
        };
    }

    const lastViolationByType = { tab: 0, rapid_click: 0, no_audio: 0 };
    function recordViolation(testId, type) {
        const t = type || 'tab';
        const now = Date.now();
        const cooldown = t === 'tab' ? 2000 : (t === 'rapid_click' ? 4000 : 6000);
        if (now - (lastViolationByType[t] || 0) < cooldown) {
            return getViolations(testId);
        }
        lastViolationByType[t] = now;

        const key = getViolationKey(testId);
        const map = readViolationMap();
        if (!map[key]) {
            map[key] = { tabSwitches: 0, rapidClicks: 0, noAudioClicks: 0, updatedAt: now };
        }
        if (t === 'tab') {
            map[key].tabSwitches = (parseInt(map[key].tabSwitches || 0, 10) || 0) + 1;
        } else if (t === 'rapid_click') {
            map[key].rapidClicks = (parseInt(map[key].rapidClicks || 0, 10) || 0) + 1;
        } else if (t === 'no_audio') {
            map[key].noAudioClicks = (parseInt(map[key].noAudioClicks || 0, 10) || 0) + 1;
        }
        map[key].updatedAt = now;
        writeViolationMap(map);
        return {
            tabSwitches: parseInt(map[key].tabSwitches || 0, 10) || 0,
            rapidClicks: parseInt(map[key].rapidClicks || 0, 10) || 0,
            noAudioClicks: parseInt(map[key].noAudioClicks || 0, 10) || 0
        };
    }

    function formatShortTime(sec) {
        const s = Math.max(0, Math.floor(Number(sec) || 0));
        const m = Math.floor(s / 60);
        const r = s % 60;
        return `${m}p${r < 10 ? '0' + r : r}s`;
    }

    function showLiveWarning(opts) {
        injectStyles();
        const existing = document.getElementById('vstep-live-warning-overlay');
        if (existing) existing.remove();

        const isRapid = opts && opts.type === 'rapid_click';
        const title = (opts && opts.title) || (isRapid ? 'CẢNH BÁO CLICK ĐÁP ÁN LIÊN TỤC!' : 'CẢNH BÁO CHƯA NGHE AUDIO!');
        const message = (opts && opts.message) || 'Vui lòng bật file Audio và nghe kỹ trước khi chọn đáp án.';
        const subNote = (opts && opts.subNote) || 'Hành vi này đã được hệ thống tự động ghi nhận vào Phiếu Báo Cáo Kết Quả và gửi về Bảng Điểm của Cô Nguyệt.';

        const overlay = document.createElement('div');
        overlay.id = 'vstep-live-warning-overlay';
        overlay.className = 'vrr-overlay';
        overlay.style.zIndex = '1000000';

        const card = document.createElement('div');
        card.className = 'vrr-modal';
        card.style.maxWidth = '480px';
        card.style.border = '2px solid #fca5a5';
        card.innerHTML = `
            <div class="vrr-header" style="background: linear-gradient(135deg, #991b1b 0%, #dc2626 100%); padding: 18px 22px;">
                <div>
                    <div class="vrr-brand" style="color: #fecaca;">🛡️ HỆ THỐNG GIÁM SÁT PHÒNG THI NGHE</div>
                    <h3 class="vrr-title" style="font-size: 17px;"><i class="fa-solid ${isRapid ? 'fa-bolt' : 'fa-volume-xmark'}"></i> ${escHtml(title)}</h3>
                </div>
                <button type="button" class="vrr-close-btn" id="vrr-warn-x" title="Đóng">&times;</button>
            </div>
            <div class="vrr-body" style="padding: 18px 22px; gap: 12px;">
                <div style="font-size: 14.5px; font-weight: 700; color: #0f172a; line-height: 1.55;">
                    ${escHtml(message)}
                </div>
                <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 10px; padding: 10px 13px; font-size: 12.5px; color: #9f1239; font-weight: 600; line-height: 1.5;">
                    <i class="fa-solid fa-circle-exclamation"></i> ${escHtml(subNote)}
                </div>
            </div>
            <div class="vrr-footer" style="padding: 12px 22px 16px;">
                ${opts && typeof opts.onPlayAudio === 'function'
                    ? `<button type="button" class="vrr-btn vrr-btn-print" id="vrr-warn-play"><i class="fa-solid fa-play"></i> Bật Audio ngay</button>`
                    : ''}
                <button type="button" class="vrr-btn vrr-btn-close" id="vrr-warn-ok" style="background:#dc2626;color:#fff;">Tôi đã hiểu</button>
            </div>
        `;

        overlay.appendChild(card);
        document.body.appendChild(overlay);

        const dismiss = () => {
            if (overlay.parentNode) overlay.remove();
        };
        overlay.onclick = (e) => { if (e.target === overlay) dismiss(); };
        const xBtn = document.getElementById('vrr-warn-x');
        if (xBtn) xBtn.onclick = dismiss;
        const okBtn = document.getElementById('vrr-warn-ok');
        if (okBtn) okBtn.onclick = dismiss;
        const playBtn = document.getElementById('vrr-warn-play');
        if (playBtn && opts && typeof opts.onPlayAudio === 'function') {
            playBtn.onclick = () => {
                dismiss();
                opts.onPlayAudio();
            };
        }
    }

    function formatDuration(totalSeconds) {
        const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
        const mins = Math.floor(sec / 60);
        const remSec = sec % 60;
        const secStr = remSec < 10 ? '0' + remSec : String(remSec);
        return {
            text: `${mins} phút ${secStr} giây`,
            isOverTime: sec > 47 * 60
        };
    }

    function getCertificationStatus(vstepScore, answeredCount) {
        if (!answeredCount || answeredCount <= 0) {
            return {
                label: 'CHƯA CÓ BÀI LÀM',
                sub: 'Chưa ghi nhận câu trả lời nào để đánh giá trình độ Nghe VSTEP',
                bg: '#f1f5f9',
                border: '#cbd5e1',
                color: '#475569',
                badge: 'CHƯA LÀM'
            };
        }
        if (vstepScore >= 8.5) {
            return {
                label: '🏅 ĐẠT CHUẨN C1 (VƯỢT CHUẨN B1 - B2)',
                sub: 'Xuất sắc! Kỹ năng Nghe vượt xa yêu cầu chuẩn đầu ra B1 (≥ 4.0) và B2 (≥ 6.0)',
                bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                border: '#3b82f6',
                color: '#1e3a8a',
                badge: 'BẬC 5 (C1)'
            };
        }
        if (vstepScore >= 6.0) {
            return {
                label: '🏅 ĐẠT CHUẨN B2 (ĐẠT CẢ B1 & B2)',
                sub: 'Chúc mừng! Bài thi đạt chuẩn B2 (≥ 6.0/10) theo khung năng lực VSTEP',
                bg: 'linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)',
                border: '#06b6d4',
                color: '#0e7490',
                badge: 'BẬC 4 (B2)'
            };
        }
        if (vstepScore >= 4.0) {
            return {
                label: '🏅 ĐẠT CHUẨN B1 (CHƯA ĐẠT CHUẨN B2)',
                sub: 'Bài thi đã đạt chuẩn B1 (≥ 4.0/10). Cần đạt từ 6.0/10 trở lên để đạt chuẩn B2',
                bg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                border: '#22c55e',
                color: '#15803d',
                badge: 'BẬC 3 (B1)'
            };
        }
        return {
            label: '❌ CHƯA ĐẠT CHUẨN B1 - B2',
            sub: 'Cần đạt tối thiểu 4.0/10 để đạt chuẩn B1 và 6.0/10 để đạt chuẩn B2',
            bg: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)',
            border: '#f43f5e',
            color: '#be123c',
            badge: 'DƯỚI B1'
        };
    }

    function injectStyles() {
        if (document.getElementById('vstep-result-report-styles')) return;
        const style = document.createElement('style');
        style.id = 'vstep-result-report-styles';
        style.textContent = `
            .vrr-overlay {
                position: fixed;
                inset: 0;
                background: rgba(15, 23, 42, 0.72);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 18px;
                overflow-y: auto;
                animation: vrrFadeIn 0.25s ease;
            }
            @keyframes vrrFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            .vrr-modal {
                width: 100%;
                max-width: 700px;
                background: #ffffff;
                border-radius: 20px;
                box-shadow: 0 25px 60px rgba(15, 23, 42, 0.35);
                overflow: hidden;
                font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
                color: #0f172a;
                margin: auto;
                border: 1.5px solid #e2e8f0;
                animation: vrrSlideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .vrr-modal.vrr-board-modal {
                max-width: 1040px;
            }
            @keyframes vrrSlideUp {
                from { transform: translateY(18px) scale(0.98); opacity: 0; }
                to { transform: translateY(0) scale(1); opacity: 1; }
            }
            .vrr-header {
                background: linear-gradient(135deg, #1e1b4b 0%, #312e81 55%, #4f46e5 100%);
                color: #ffffff;
                padding: 20px 24px;
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 12px;
            }
            .vrr-brand {
                font-size: 11px;
                font-weight: 800;
                letter-spacing: 1px;
                text-transform: uppercase;
                color: #c7d2fe;
                margin-bottom: 4px;
            }
            .vrr-title {
                margin: 0;
                font-size: 20px;
                font-weight: 800;
                letter-spacing: -0.2px;
                color: #ffffff;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .vrr-sync-pill {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                margin-top: 8px;
                font-size: 12px;
                font-weight: 700;
                padding: 4px 12px;
                border-radius: 999px;
            }
            .vrr-sync-pill.synced {
                background: rgba(16, 185, 129, 0.22);
                color: #a7f3d0;
                border: 1px solid rgba(52, 211, 153, 0.5);
            }
            .vrr-close-btn {
                background: rgba(255, 255, 255, 0.14);
                border: 1px solid rgba(255, 255, 255, 0.25);
                color: #ffffff;
                width: 34px;
                height: 34px;
                border-radius: 10px;
                font-size: 18px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                transition: background 0.2s;
            }
            .vrr-close-btn:hover { background: rgba(255, 255, 255, 0.28); }
            .vrr-body {
                padding: 20px 24px;
                display: flex;
                flex-direction: column;
                gap: 14px;
                max-height: 75vh;
                overflow-y: auto;
            }
            .vrr-info-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 10px;
            }
            @media (max-width: 540px) {
                .vrr-info-grid { grid-template-columns: 1fr; }
            }
            .vrr-info-cell {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 12px 14px;
            }
            .vrr-cell-label {
                font-size: 11.5px;
                font-weight: 700;
                text-transform: uppercase;
                color: #64748b;
                margin-bottom: 4px;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .vrr-cell-val {
                font-size: 15px;
                font-weight: 800;
                color: #0f172a;
                line-height: 1.4;
            }
            .vrr-cell-sub {
                font-size: 12.5px;
                color: #475569;
                margin-top: 3px;
                line-height: 1.45;
            }
            .vrr-overtime-tag {
                display: inline-block;
                margin-left: 6px;
                padding: 2px 8px;
                border-radius: 6px;
                background: #fee2e2;
                color: #b91c1c;
                border: 1px solid #fca5a5;
                font-size: 11.5px;
                font-weight: 800;
                vertical-align: middle;
            }
            .vrr-integrity-box {
                border-radius: 12px;
                padding: 13px 16px;
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            .vrr-integrity-box.clean {
                background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
                border: 1.5px solid #86efac;
                color: #14532d;
            }
            .vrr-integrity-box.warn {
                background: linear-gradient(135deg, #fff1f2 0%, #fee2e2 100%);
                border: 1.5px solid #fca5a5;
                color: #991b1b;
            }
            .vrr-score-card {
                background: linear-gradient(135deg, #eef2ff 0%, #f8fafc 100%);
                border: 1.5px solid #c7d2fe;
                border-radius: 14px;
                padding: 16px 18px;
            }
            .vrr-score-main-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 12px;
                padding-bottom: 12px;
                border-bottom: 1.5px dashed #c7d2fe;
                margin-bottom: 12px;
            }
            .vrr-big-score {
                font-size: 36px;
                font-weight: 900;
                color: #1e1b4b;
                line-height: 1;
                letter-spacing: -1px;
            }
            .vrr-big-score span {
                font-size: 16px;
                font-weight: 700;
                color: #6366f1;
            }
            .vrr-score-breakdown-3 {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 10px;
            }
            @media (max-width: 600px) {
                .vrr-score-breakdown-3 { grid-template-columns: 1fr; }
            }
            .vrr-part-score-box {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                padding: 11px 13px;
            }
            .vrr-part-bar-track {
                width: 100%;
                height: 6px;
                background: #e2e8f0;
                border-radius: 999px;
                overflow: hidden;
                margin-top: 7px;
            }
            .vrr-part-bar-fill {
                height: 100%;
                border-radius: 999px;
                transition: width 0.35s ease;
            }
            .vrr-cert-box {
                border-radius: 12px;
                padding: 14px 16px;
                border: 1.5px solid;
                text-align: center;
            }
            .vrr-footer {
                padding: 14px 24px 18px;
                background: #f8fafc;
                border-top: 1px solid #e2e8f0;
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                flex-wrap: wrap;
            }
            .vrr-btn {
                border: none;
                border-radius: 10px;
                padding: 10px 16px;
                font-size: 13.5px;
                font-weight: 700;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 7px;
                transition: transform 0.15s, opacity 0.15s;
                font-family: inherit;
            }
            .vrr-btn:hover { opacity: 0.92; transform: translateY(-1px); }
            .vrr-btn-print {
                background: linear-gradient(135deg, #4f46e5, #6366f1);
                color: #ffffff;
                box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
            }
            .vrr-btn-copy {
                background: linear-gradient(135deg, #059669, #10b981);
                color: #ffffff;
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.22);
            }
            .vrr-btn-close {
                background: #e2e8f0;
                color: #334155;
            }
            /* Teacher Results Board Table */
            .vrr-board-toolbar {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                align-items: center;
                justify-content: space-between;
            }
            .vrr-board-filters {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                align-items: center;
            }
            .vrr-board-input, .vrr-board-select {
                padding: 8px 12px;
                border-radius: 8px;
                border: 1.5px solid #cbd5e1;
                font-size: 13px;
                font-weight: 600;
                color: #0f172a;
                background: #ffffff;
                outline: none;
                font-family: inherit;
            }
            .vrr-board-input:focus, .vrr-board-select:focus {
                border-color: #6366f1;
            }
            .vrr-board-stats {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 10px;
            }
            @media (max-width: 640px) {
                .vrr-board-stats { grid-template-columns: repeat(2, 1fr); }
            }
            .vrr-board-stat {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                padding: 10px 12px;
                text-align: center;
            }
            .vrr-board-stat-val {
                font-size: 20px;
                font-weight: 900;
                color: #1e1b4b;
            }
            .vrr-board-stat-lbl {
                font-size: 11px;
                font-weight: 700;
                color: #64748b;
                text-transform: uppercase;
                margin-top: 2px;
            }
            .vrr-table-wrap {
                width: 100%;
                overflow-x: auto;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
            }
            .vrr-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 13px;
            }
            .vrr-table th {
                background: #f1f5f9;
                color: #334155;
                font-weight: 800;
                text-align: left;
                padding: 10px 12px;
                border-bottom: 1.5px solid #cbd5e1;
                white-space: nowrap;
                font-size: 11.5px;
                text-transform: uppercase;
            }
            .vrr-table td {
                padding: 10px 12px;
                border-bottom: 1px solid #f1f5f9;
                color: #0f172a;
                vertical-align: middle;
            }
            .vrr-table tr:hover td {
                background: #f8fafc;
            }
            .vrr-pill {
                display: inline-block;
                padding: 3px 8px;
                border-radius: 999px;
                font-size: 11.5px;
                font-weight: 800;
                white-space: nowrap;
            }
            .vrr-pill-c1 { background: #dbeafe; color: #1e40af; }
            .vrr-pill-b2 { background: #cffafe; color: #0e7490; }
            .vrr-pill-b1 { background: #dcfce7; color: #15803d; }
            .vrr-pill-fail { background: #fee2e2; color: #b91c1c; }
            .vrr-pill-clean { background: #dcfce7; color: #15803d; }
            .vrr-pill-warn { background: #fee2e2; color: #b91c1c; }
        `;
        document.head.appendChild(style);
    }

    function buildModalInnerHtml(data) {
        const testPad = (parseInt(data.testId, 10) || 1).toString().padStart(2, '0');
        const dur = formatDuration(data.elapsedSeconds);
        const totalQuestions = parseInt(data.totalQuestions || 35, 10) || 35;
        const correctCount = parseInt(data.correctCount || 0, 10) || 0;
        const answeredCount = parseInt(data.answeredCount != null ? data.answeredCount : correctCount, 10) || 0;
        const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
        const vstepScore = Number(data.vstepScore || 0);

        const tabCount = parseInt(data.tabSwitches || 0, 10) || 0;
        const rapidCount = parseInt(data.rapidClicks || 0, 10) || 0;
        const noAudioCount = parseInt(data.noAudioClicks || 0, 10) || 0;
        const totalListenedSec = Math.max(0, Math.floor(Number(data.totalListenedSeconds || 0)));
        const partListened = data.partListenedSeconds || {};
        const lowAudioWarning = answeredCount >= 10 && totalListenedSec < 180;
        const hasViolation = tabCount > 0 || rapidCount > 0 || noAudioCount > 0 || lowAudioWarning;

        const parts = Array.isArray(data.partScores) && data.partScores.length > 0
            ? data.partScores
            : [
                { id: 1, name: 'Part 1 (Câu 1–8)', sub: 'Thông báo ngắn', correct: 0, total: 8 },
                { id: 2, name: 'Part 2 (Câu 9–20)', sub: '3 đoạn Hội thoại', correct: 0, total: 12 },
                { id: 3, name: 'Part 3 (Câu 21–35)', sub: '3 bài Nói / Giảng', correct: 0, total: 15 }
            ];

        const cert = getCertificationStatus(vstepScore, answeredCount);
        const listenedDur = formatDuration(totalListenedSec);
        const partListenDetail = [1, 2, 3].map(pid => `P${pid}: ${formatShortTime(partListened[pid] || 0)}`).join(' • ');

        let integrityHtml = '';
        if (!hasViolation) {
            integrityHtml = `
                <div class="vrr-integrity-box clean">
                    <div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.4px;color:#15803d;">🛡️ Giám sát trung thực &amp; Thời lượng nghe Audio</div>
                    <div style="font-size:15px;font-weight:800;display:flex;align-items:center;gap:8px;">
                        <span>✅ Làm bài trung thực (0 chuyển tab • 0 click lụi)</span>
                    </div>
                    <div style="font-size:12.5px;color:#166534;font-weight:600;">
                        🎧 Thời gian nghe Audio thực tế: <strong>${escHtml(listenedDur.text)}</strong> (${escHtml(partListenDetail)})
                    </div>
                </div>`;
        } else {
            const warnLines = [];
            if (tabCount > 0) {
                warnLines.push(`<div style="font-size:14.5px;font-weight:800;">⚠️ Phát hiện chuyển tab / rời phòng thi: <strong>${tabCount} lần</strong></div>`);
            }
            if (rapidCount > 0) {
                warnLines.push(`<div style="font-size:14.5px;font-weight:800;">⚡ Phát hiện click đáp án liên tục (nghi vấn đánh lụi): <strong>${rapidCount} lần</strong></div>`);
            }
            if (noAudioCount > 0) {
                warnLines.push(`<div style="font-size:14.5px;font-weight:800;">🔇 Chọn đáp án khi chưa mở / chưa nghe đủ Audio: <strong>${noAudioCount} lần</strong></div>`);
            }
            if (lowAudioWarning) {
                warnLines.push(`<div style="font-size:14px;font-weight:800;">🚨 Thời lượng nghe Audio thực tế quá thấp (<strong>${escHtml(listenedDur.text)}</strong>) so với ${answeredCount} câu đã làm!</div>`);
            }
            integrityHtml = `
                <div class="vrr-integrity-box warn">
                    <div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.4px;color:#b91c1c;">🛡️ Cảnh báo gian lận &amp; Nghi vấn không nghe Audio</div>
                    ${warnLines.join('')}
                    <div style="font-size:12.5px;color:#7f1d1d;font-weight:700;margin-top:2px;">
                        🎧 Thời gian nghe Audio thực tế: <strong>${escHtml(listenedDur.text)}</strong> (${escHtml(partListenDetail)})
                    </div>
                    <div style="font-size:12px;color:#7f1d1d;opacity:0.9;">
                        (Số lần vi phạm được lưu cố định theo bài thi, không bị xóa khi làm lại bài)
                    </div>
                </div>`;
        }

        const partColors = ['#4f46e5', '#0891b2', '#7c3aed'];
        const partBoxesHtml = parts.map((p, idx) => {
            const pct = p.total > 0 ? Math.round((p.correct / p.total) * 100) : 0;
            const col = partColors[idx % partColors.length];
            return `
                <div class="vrr-part-score-box">
                    <div style="font-size:11.5px;font-weight:800;color:${col};text-transform:uppercase;">${escHtml(p.name)}</div>
                    <div style="font-size:19px;font-weight:800;color:#0f172a;margin-top:3px;">${p.correct} <span style="font-size:13px;color:#64748b;">/ ${p.total}</span></div>
                    <div style="font-size:12px;color:#475569;margin-top:2px;">${escHtml(p.sub || '')} • <strong>${pct}%</strong></div>
                    <div class="vrr-part-bar-track">
                        <div class="vrr-part-bar-fill" style="width:${pct}%;background:${col};"></div>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="vrr-header">
                <div>
                    <div class="vrr-brand">ENGLISH WITH MISS NGUYET • VSTEP LISTENING</div>
                    <h2 class="vrr-title"><i class="fa-solid fa-file-invoice"></i> PHIẾU BÁO CÁO KẾT QUẢ</h2>
                    <div class="vrr-sync-pill synced"><i class="fa-solid fa-circle-check"></i> Đã chấm điểm chuẩn VSTEP &amp; đồng bộ hệ thống Cô Nguyệt</div>
                </div>
                <button type="button" class="vrr-close-btn" onclick="VstepResultReport.close()" title="Đóng">&times;</button>
            </div>
            <div class="vrr-body">
                <div class="vrr-info-grid">
                    <div class="vrr-info-cell">
                        <div class="vrr-cell-label">👤 Tên học viên</div>
                        <div class="vrr-cell-val">${escHtml(data.studentName)}</div>
                    </div>
                    <div class="vrr-info-cell">
                        <div class="vrr-cell-label">🏫 Lớp</div>
                        <div class="vrr-cell-val">${escHtml(data.studentClass)}</div>
                    </div>
                    <div class="vrr-info-cell">
                        <div class="vrr-cell-label">🎧 Bài thi</div>
                        <div class="vrr-cell-val" style="color:#4338ca;">LISTENING MOCK TEST ${testPad}</div>
                        <div class="vrr-cell-sub">📅 Nộp lúc: <strong>${escHtml(data.submittedAt)}</strong></div>
                    </div>
                    <div class="vrr-info-cell">
                        <div class="vrr-cell-label">⏱️ Thời gian làm bài &amp; Tiến độ</div>
                        <div class="vrr-cell-val">
                            ${escHtml(dur.text)}
                            ${dur.isOverTime ? '<span class="vrr-overtime-tag">Quá 47 phút</span>' : ''}
                        </div>
                        <div class="vrr-cell-sub">📝 Đã trả lời: <strong>${answeredCount}/${totalQuestions} câu</strong> • Đúng: <strong>${correctCount}/${totalQuestions}</strong></div>
                    </div>
                </div>

                ${integrityHtml}

                <div class="vrr-score-card">
                    <div class="vrr-score-main-row">
                        <div>
                            <div style="font-size:12px;font-weight:800;text-transform:uppercase;color:#4338ca;letter-spacing:0.4px;">🎯 ĐIỂM SỐ CHÍNH THỨC (THANG 10)</div>
                            <div style="font-size:12.5px;color:#475569;margin-top:2px;">Chính xác: <strong>${correctCount}/${totalQuestions} câu (${accuracy}%)</strong> • Quy đổi chuẩn thang VSTEP 0.5</div>
                        </div>
                        <div class="vrr-big-score">${vstepScore.toFixed(1)} <span>/ 10</span></div>
                    </div>
                    <div class="vrr-score-breakdown-3">
                        ${partBoxesHtml}
                    </div>
                </div>

                <div class="vrr-cert-box" style="background:${cert.bg};border-color:${cert.border};color:${cert.color};">
                    <div style="font-size:16.5px;font-weight:900;letter-spacing:-0.1px;">${cert.label}</div>
                    <div style="font-size:13px;font-weight:600;margin-top:4px;opacity:0.92;">${cert.sub}</div>
                </div>
            </div>
            <div class="vrr-footer">
                <button type="button" class="vrr-btn vrr-btn-copy" id="vrr-btn-copy-summary" onclick="VstepResultReport.copySummary()">
                    <i class="fa-solid fa-copy"></i> Sao chép báo cáo gửi Cô
                </button>
                <button type="button" class="vrr-btn vrr-btn-print" onclick="VstepResultReport.printReport()">
                    <i class="fa-solid fa-print"></i> In / Lưu PDF Phiếu Báo Cáo
                </button>
                <button type="button" class="vrr-btn vrr-btn-close" onclick="VstepResultReport.close()">
                    Đóng
                </button>
            </div>
        `;
    }

    function setReportData(data) {
        const st = getLoggedInStudent();
        const viol = getViolations(data.testId);
        currentReportState = {
            testId: parseInt(data.testId, 10) || 1,
            testTitle: data.testTitle || ('VSTEP Listening Mock Test ' + String(data.testId || 1).padStart(2, '0')),
            studentName: (data.studentName && data.studentName !== 'Học viên') ? data.studentName : st.name,
            studentClass: data.studentClass || st.className,
            elapsedSeconds: Number(data.elapsedSeconds || 0),
            submittedAt: data.submittedAt || new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
            correctCount: parseInt(data.correctCount || 0, 10) || 0,
            totalQuestions: parseInt(data.totalQuestions || 35, 10) || 35,
            answeredCount: parseInt(data.answeredCount != null ? data.answeredCount : (data.correctCount || 0), 10) || 0,
            vstepScore: Number(data.vstepScore || 0),
            partScores: Array.isArray(data.partScores) ? data.partScores : [],
            tabSwitches: typeof data.tabSwitches === 'number' ? data.tabSwitches : viol.tabSwitches,
            rapidClicks: typeof data.rapidClicks === 'number' ? data.rapidClicks : viol.rapidClicks,
            noAudioClicks: typeof data.noAudioClicks === 'number' ? data.noAudioClicks : viol.noAudioClicks,
            totalListenedSeconds: Number(data.totalListenedSeconds || 0),
            partListenedSeconds: data.partListenedSeconds || {}
        };
        rerenderIfOpen();
        return currentReportState;
    }

    function rerenderIfOpen() {
        const modal = document.getElementById('vstep-result-report-modal');
        if (modal && currentReportState) {
            modal.innerHTML = buildModalInnerHtml(currentReportState);
        }
    }

    function open(optionalData) {
        injectStyles();
        if (optionalData) {
            setReportData(optionalData);
        }
        if (!currentReportState) {
            alert('Chưa có dữ liệu bài làm để xuất Phiếu Báo Cáo Kết Quả.');
            return;
        }
        let overlay = document.getElementById('vstep-result-report-overlay');
        if (overlay) overlay.remove();

        overlay = document.createElement('div');
        overlay.id = 'vstep-result-report-overlay';
        overlay.className = 'vrr-overlay';
        overlay.onclick = (e) => {
            if (e.target === overlay) close();
        };

        const modal = document.createElement('div');
        modal.id = 'vstep-result-report-modal';
        modal.className = 'vrr-modal';
        modal.innerHTML = buildModalInnerHtml(currentReportState);

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    }

    function close() {
        const overlay = document.getElementById('vstep-result-report-overlay');
        if (overlay) overlay.remove();
        const boardOverlay = document.getElementById('vstep-teacher-board-overlay');
        if (boardOverlay) boardOverlay.remove();
    }

    function copySummary() {
        if (!currentReportState) return;
        const d = currentReportState;
        const testPad = String(d.testId).padStart(2, '0');
        const dur = formatDuration(d.elapsedSeconds);
        const cert = getCertificationStatus(d.vstepScore, d.answeredCount);
        const partText = (d.partScores || []).map(p => `${p.name}: ${p.correct}/${p.total}`).join(' | ');
        const listenedDur = formatDuration(d.totalListenedSeconds || 0);
        const text = [
            `🎧 BÁO CÁO KẾT QUẢ VSTEP LISTENING MOCK TEST ${testPad}`,
            `👤 Học viên: ${d.studentName} — Lớp: ${d.studentClass}`,
            `📅 Nộp lúc: ${d.submittedAt} | ⏱️ Thời gian: ${dur.text} | 🔊 Đã nghe Audio: ${listenedDur.text}`,
            `🎯 Điểm: ${d.vstepScore.toFixed(1)}/10 (${d.correctCount}/${d.totalQuestions} câu đúng)`,
            partText ? `📊 Chi tiết: ${partText}` : '',
            `🏅 Đánh giá: ${cert.badge}`,
            `🛡️ Trung thực: Chuyển tab ${d.tabSwitches || 0} • Click lụi ${d.rapidClicks || 0} • Không nghe Audio ${d.noAudioClicks || 0}`
        ].filter(Boolean).join('\n');

        const markCopied = () => {
            const btn = document.getElementById('vrr-btn-copy-summary');
            if (btn) {
                btn.innerHTML = '<i class="fa-solid fa-check"></i> Đã sao chép!';
                setTimeout(() => {
                    btn.innerHTML = '<i class="fa-solid fa-copy"></i> Sao chép báo cáo gửi Cô';
                }, 2200);
            }
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(markCopied).catch(() => {
                prompt('Sao chép báo cáo bên dưới:', text);
            });
        } else {
            prompt('Sao chép báo cáo bên dưới:', text);
        }
    }

    function printReport() {
        if (!currentReportState) return;
        const w = window.open('', '_blank', 'width=840,height=920');
        if (!w) {
            window.print();
            return;
        }
        const styleEl = document.getElementById('vstep-result-report-styles');
        const css = styleEl ? styleEl.textContent : '';
        w.document.write(`<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Phiếu Báo Cáo Kết Quả - LISTENING MOCK TEST ${String(currentReportState.testId).padStart(2, '0')}</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<style>
${css}
body { margin: 24px; background: #ffffff; display: flex; justify-content: center; }
.vrr-modal { box-shadow: none; max-width: 720px; border: 2px solid #cbd5e1; }
.vrr-body { max-height: none; overflow: visible; }
.vrr-close-btn, .vrr-footer { display: none !important; }
@media print { body { margin: 0; } }
</style>
</head>
<body>
<div class="vrr-modal">${buildModalInnerHtml(currentReportState)}</div>
<script>setTimeout(function(){ window.print(); }, 450);<\/script>
</body>
</html>`);
        w.document.close();
    }

    // =========================================================================
    // TEACHER RESULTS BOARD (BẢNG TỔNG HỢP KẾT QUẢ THI LISTENING TỪ FIREBASE)
    // =========================================================================
    let cachedBoardRows = [];

    function flattenListeningResults(rawProgress) {
        const rows = [];
        if (!rawProgress || typeof rawProgress !== 'object') return rows;
        Object.keys(rawProgress).forEach(studentKey => {
            const node = rawProgress[studentKey];
            if (!node || typeof node !== 'object') return;
            const listNode = node.listening;
            if (!listNode || typeof listNode !== 'object') return;
            Object.keys(listNode).forEach(testIdStr => {
                const rec = listNode[testIdStr];
                if (!rec || typeof rec !== 'object') return;
                const testId = parseInt(testIdStr, 10) || 0;
                if (testId <= 0) return;

                let vstepScore = typeof rec.vstepScore === 'number' ? rec.vstepScore : null;
                let correctCount = typeof rec.correctCount === 'number' ? rec.correctCount : null;
                let totalQuestions = typeof rec.totalQuestions === 'number' ? rec.totalQuestions : 35;

                // Fallback parse from details string if structured fields absent
                const det = String(rec.details || '');
                if (vstepScore === null) {
                    const mScore = det.match(/(\d+(?:\.\d+)?)\s*\/\s*10/);
                    if (mScore) vstepScore = parseFloat(mScore[1]);
                }
                if (correctCount === null) {
                    const mCorr = det.match(/(\d+)\s*\/\s*35/);
                    if (mCorr) correctCount = parseInt(mCorr[1], 10);
                }

                rows.push({
                    studentKey,
                    name: rec.name || studentKey,
                    className: (rec.className || '').toUpperCase() || '—',
                    testId,
                    correctCount,
                    totalQuestions,
                    vstepScore,
                    partSummary: rec.partSummary || '',
                    durationText: rec.durationText || '',
                    listenedText: rec.listenedText || '',
                    tabSwitches: typeof rec.tabSwitches === 'number' ? rec.tabSwitches : null,
                    rapidClicks: typeof rec.rapidClicks === 'number' ? rec.rapidClicks : null,
                    noAudioClicks: typeof rec.noAudioClicks === 'number' ? rec.noAudioClicks : null,
                    details: det,
                    updatedAt: Number(rec.updatedAt || 0)
                });
            });
        });
        rows.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        return rows;
    }

    function renderBoardContent(modalEl) {
        const qName = (document.getElementById('vrr-board-search')?.value || '').trim().toLowerCase();
        const qClass = (document.getElementById('vrr-board-class')?.value || 'ALL').toUpperCase();
        const qTest = document.getElementById('vrr-board-test')?.value || 'ALL';

        const filtered = cachedBoardRows.filter(r => {
            if (qClass !== 'ALL' && r.className !== qClass) return false;
            if (qTest !== 'ALL' && String(r.testId) !== qTest) return false;
            if (qName && !r.name.toLowerCase().includes(qName) && !r.className.toLowerCase().includes(qName)) return false;
            return true;
        });

        const totalSub = filtered.length;
        const scoredRows = filtered.filter(r => typeof r.vstepScore === 'number');
        const avgVstep = scoredRows.length > 0
            ? (scoredRows.reduce((s, r) => s + r.vstepScore, 0) / scoredRows.length).toFixed(1)
            : '—';
        const passB1 = scoredRows.filter(r => r.vstepScore >= 4.0).length;
        const passB2 = scoredRows.filter(r => r.vstepScore >= 6.0).length;

        const statsEl = document.getElementById('vrr-board-stats-host');
        if (statsEl) {
            statsEl.innerHTML = `
                <div class="vrr-board-stat"><div class="vrr-board-stat-val">${totalSub}</div><div class="vrr-board-stat-lbl">Lượt nộp bài</div></div>
                <div class="vrr-board-stat"><div class="vrr-board-stat-val" style="color:#4f46e5;">${avgVstep}</div><div class="vrr-board-stat-lbl">Điểm TB (Thang 10)</div></div>
                <div class="vrr-board-stat"><div class="vrr-board-stat-val" style="color:#15803d;">${passB1}</div><div class="vrr-board-stat-lbl">Đạt B1+ (≥ 4.0)</div></div>
                <div class="vrr-board-stat"><div class="vrr-board-stat-val" style="color:#0891b2;">${passB2}</div><div class="vrr-board-stat-lbl">Đạt B2+ (≥ 6.0)</div></div>
            `;
        }

        const tbody = document.getElementById('vrr-board-tbody');
        if (!tbody) return;

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px;color:#64748b;font-weight:600;">Chưa có dữ liệu kết quả thi Nghe nào phù hợp bộ lọc.</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map((r, i) => {
            const pad = String(r.testId).padStart(2, '0');
            const timeStr = r.updatedAt ? new Date(r.updatedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
            const scoreStr = typeof r.vstepScore === 'number' ? `<strong>${r.vstepScore.toFixed(1)}</strong> / 10` : '—';
            const corrStr = typeof r.correctCount === 'number' ? `${r.correctCount}/${r.totalQuestions}` : '—';

            let bandPill = '<span class="vrr-pill" style="background:#f1f5f9;color:#475569;">—</span>';
            if (typeof r.vstepScore === 'number') {
                if (r.vstepScore >= 8.5) bandPill = '<span class="vrr-pill vrr-pill-c1">C1</span>';
                else if (r.vstepScore >= 6.0) bandPill = '<span class="vrr-pill vrr-pill-b2">B2</span>';
                else if (r.vstepScore >= 4.0) bandPill = '<span class="vrr-pill vrr-pill-b1">B1</span>';
                else bandPill = '<span class="vrr-pill vrr-pill-fail">Dưới B1</span>';
            }

            const integrityPills = [];
            if (r.tabSwitches && r.tabSwitches > 0) {
                integrityPills.push(`<span class="vrr-pill vrr-pill-warn">⚠️ Tab: ${r.tabSwitches}</span>`);
            }
            if (r.rapidClicks && r.rapidClicks > 0) {
                integrityPills.push(`<span class="vrr-pill vrr-pill-warn">⚡ Lụi: ${r.rapidClicks}</span>`);
            }
            if (r.noAudioClicks && r.noAudioClicks > 0) {
                integrityPills.push(`<span class="vrr-pill vrr-pill-warn">🔇 Không nghe: ${r.noAudioClicks}</span>`);
            }
            const tabPill = integrityPills.length > 0
                ? `<div style="display:flex;flex-wrap:wrap;gap:4px;">${integrityPills.join('')}</div>`
                : (r.tabSwitches === null ? '<span style="color:#94a3b8;">—</span>' : '<span class="vrr-pill vrr-pill-clean">✅ Trung thực</span>');

            return `
                <tr>
                    <td style="color:#64748b;font-weight:700;">${i + 1}</td>
                    <td><strong>${escHtml(r.name)}</strong></td>
                    <td><span class="vrr-pill" style="background:#eef2ff;color:#4338ca;">${escHtml(r.className)}</span></td>
                    <td><strong>Test ${pad}</strong></td>
                    <td>${scoreStr} <span style="color:#64748b;font-size:12px;">(${corrStr})</span></td>
                    <td>${bandPill}</td>
                    <td style="font-size:12px;color:#475569;">${escHtml(r.partSummary || r.details || '—')}${r.durationText ? `<div style="color:#64748b;margin-top:2px;">⏱️ ${escHtml(r.durationText)}${r.listenedText ? ` • 🔊 Nghe: ${escHtml(r.listenedText)}` : ''}</div>` : ''}</td>
                    <td>${tabPill}<div style="font-size:11px;color:#64748b;margin-top:3px;">${escHtml(timeStr)}</div></td>
                </tr>
            `;
        }).join('');
    }

    function exportBoardCSV() {
        if (!cachedBoardRows || cachedBoardRows.length === 0) {
            alert('Chưa có dữ liệu để xuất file Excel/CSV.');
            return;
        }
        const headers = ['STT', 'Họ và tên', 'Lớp', 'Đề thi', 'Số câu đúng', 'Điểm VSTEP', 'Xếp loại', 'Chi tiết Part', 'Thời gian làm', 'Thời gian nghe Audio', 'Chuyển tab', 'Click lụi', 'Không nghe Audio', 'Thời điểm nộp'];
        const csvRows = [headers.join(',')];
        cachedBoardRows.forEach((r, i) => {
            const band = typeof r.vstepScore === 'number'
                ? (r.vstepScore >= 8.5 ? 'C1' : r.vstepScore >= 6.0 ? 'B2' : r.vstepScore >= 4.0 ? 'B1' : 'Duoi B1')
                : '';
            const timeStr = r.updatedAt ? new Date(r.updatedAt).toLocaleString('vi-VN') : '';
            const cols = [
                i + 1,
                r.name,
                r.className,
                'Test ' + String(r.testId).padStart(2, '0'),
                r.correctCount != null ? `${r.correctCount}/${r.totalQuestions}` : '',
                r.vstepScore != null ? r.vstepScore.toFixed(1) : '',
                band,
                r.partSummary || r.details || '',
                r.durationText || '',
                r.listenedText || '',
                r.tabSwitches != null ? r.tabSwitches : '',
                r.rapidClicks != null ? r.rapidClicks : '',
                r.noAudioClicks != null ? r.noAudioClicks : '',
                timeStr
            ].map(v => `"${String(v).replace(/"/g, '""')}"`);
            csvRows.push(cols.join(','));
        });
        const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Bang_Ket_Qua_Listening_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    function openTeacherBoard() {
        injectStyles();
        let overlay = document.getElementById('vstep-teacher-board-overlay');
        if (overlay) overlay.remove();

        overlay = document.createElement('div');
        overlay.id = 'vstep-teacher-board-overlay';
        overlay.className = 'vrr-overlay';
        overlay.onclick = (e) => {
            if (e.target === overlay) overlay.remove();
        };

        const modal = document.createElement('div');
        modal.className = 'vrr-modal vrr-board-modal';
        modal.innerHTML = `
            <div class="vrr-header">
                <div>
                    <div class="vrr-brand">ENGLISH WITH MISS NGUYET • BẢNG QUẢN LÝ ĐIỂM THI</div>
                    <h2 class="vrr-title"><i class="fa-solid fa-chart-column"></i> BẢNG BÁO KẾT QUẢ THI LISTENING</h2>
                </div>
                <button type="button" class="vrr-close-btn" onclick="VstepResultReport.close()" title="Đóng">&times;</button>
            </div>
            <div class="vrr-body">
                <div class="vrr-board-toolbar">
                    <div class="vrr-board-filters">
                        <input id="vrr-board-search" class="vrr-board-input" type="text" placeholder="🔍 Tìm tên học viên..." oninput="VstepResultReport.filterBoard()" />
                        <select id="vrr-board-class" class="vrr-board-select" onchange="VstepResultReport.filterBoard()">
                            <option value="ALL">Tất cả các lớp</option>
                        </select>
                        <select id="vrr-board-test" class="vrr-board-select" onchange="VstepResultReport.filterBoard()">
                            <option value="ALL">Tất cả đề thi</option>
                            ${[1,2,3,4,5,6,7,8,9].map(n => `<option value="${n}">Listening Test ${String(n).padStart(2,'0')}</option>`).join('')}
                        </select>
                    </div>
                    <div style="display:flex;gap:8px;">
                        <button type="button" class="vrr-btn vrr-btn-copy" onclick="VstepResultReport.exportBoardCSV()">
                            <i class="fa-solid fa-file-excel"></i> Xuất Excel (CSV)
                        </button>
                        <button type="button" class="vrr-btn vrr-btn-print" onclick="VstepResultReport.refreshTeacherBoard()">
                            <i class="fa-solid fa-rotate"></i> Tải lại
                        </button>
                    </div>
                </div>
                <div id="vrr-board-stats-host" class="vrr-board-stats"></div>
                <div class="vrr-table-wrap">
                    <table class="vrr-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Học viên</th>
                                <th>Lớp</th>
                                <th>Đề thi</th>
                                <th>Điểm VSTEP</th>
                                <th>Bậc</th>
                                <th>Chi tiết &amp; Thời gian</th>
                                <th>Trung thực / Nộp lúc</th>
                            </tr>
                        </thead>
                        <tbody id="vrr-board-tbody">
                            <tr><td colspan="8" style="text-align:center;padding:28px;color:#64748b;"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải dữ liệu kết quả thi từ hệ thống...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="vrr-footer">
                <button type="button" class="vrr-btn vrr-btn-close" onclick="VstepResultReport.close()">Đóng</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        refreshTeacherBoard();
    }

    function refreshTeacherBoard() {
        const tbody = document.getElementById('vrr-board-tbody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:28px;color:#64748b;"><i class="fa-solid fa-spinner fa-spin"></i> Đang đồng bộ bảng kết quả thi từ Firebase...</td></tr>`;
        }
        fetch(`${RTDB_BASE}/student_progress.json`, { cache: 'no-store' })
            .then(res => {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            })
            .then(data => {
                cachedBoardRows = flattenListeningResults(data);
                const classSelect = document.getElementById('vrr-board-class');
                if (classSelect) {
                    const prev = classSelect.value || 'ALL';
                    const classes = Array.from(new Set(cachedBoardRows.map(r => r.className).filter(Boolean))).sort();
                    classSelect.innerHTML = `<option value="ALL">Tất cả các lớp (${classes.length})</option>` +
                        classes.map(c => `<option value="${escHtml(c)}">Lớp ${escHtml(c)}</option>`).join('');
                    if (classes.includes(prev)) classSelect.value = prev;
                }
                renderBoardContent();
            })
            .catch(err => {
                if (tbody) {
                    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:28px;color:#b91c1c;font-weight:600;">Không thể tải bảng điểm từ Firebase (${escHtml(err.message)}). Vui lòng thử lại.</td></tr>`;
                }
            });
    }

    global.VstepResultReport = {
        getLoggedInStudent,
        getViolations,
        recordViolation,
        showLiveWarning,
        formatDuration,
        formatShortTime,
        getCertificationStatus,
        setReportData,
        getCurrentState: () => currentReportState,
        open,
        close,
        copySummary,
        printReport,
        openTeacherBoard,
        refreshTeacherBoard,
        filterBoard: () => renderBoardContent(),
        exportBoardCSV
    };
})(window);
