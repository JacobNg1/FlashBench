/* ============================================================
 * 英语教师工作台 - 功能模块
 * 14个模块的完整实现
 * ============================================================ */

const M = {};
M._tabs = {};

// 图表配色
const CC = {
  green: '#10b981', greenL: '#34d399', greenD: '#059669',
  blue: '#3b82f6', blueL: '#60a5fa',
  amber: '#f59e0b', amberL: '#fbbf24',
  red: '#ef4444', redL: '#f87171',
  purple: '#8b5cf6', pink: '#ec4899', cyan: '#06b6d4',
  gray: '#9ca3af'
};

const PALETTE = [CC.green, CC.blue, CC.amber, CC.purple, CC.pink, CC.cyan, CC.red, CC.greenL];

/* ===== 辅助函数 ===== */
function getStudents() { return Store.cd('students'); }
function getSchedule() { return Store.cd('schedule'); }

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function todayDayLabel() {
  const map = {1:'周一',2:'周二',3:'周三',4:'周四',5:'周五'};
  return map[new Date().getDay()] || '';
}

function dateLabel(d) {
  return d ? d.slice(5) : '';
}

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function tabBar(tabs, current) {
  return `<div class="tabs">${tabs.map(t => `<div class="tab ${t.id===current?'active':''}" onclick="M._tabs['${t.group}']='${t.id}';M.${t.group}()">${t.label}</div>`).join('')}</div>`;
}

/* ============================================================
 * 1. 仪表盘
 * ============================================================ */
M.dashboard = function() {
  try {
  const cls = Store.getCurrentClass();
  const students = getStudents();
  const homework = Store.cd('homework');
  const todos = Store.gd('todos');
  const records = Store.gd('workRecords');
  const recitation = Store.cd('recitation');
  const news = Store.gd('news');
  const pendingHw = homework.filter(h => h.status === '进行中').length;
  const pendingTodo = todos.filter(t => !t.done).length;
  const dayLabel = todayDayLabel();
  const schedule = getSchedule();
  const todaySchedule = dayLabel ? schedule.filter(s => s.day === dayLabel) : [];
  todaySchedule.sort((a,b) => a.time.localeCompare(b.time));
  const recTotal = students.length * 71; // 48学生 x 71页
  const recDone = recitation.filter(r => r.status === 'pass').length;
  const recRate = recTotal ? Math.round(recDone / recTotal * 100) : 0;
  const todayNews = news.slice(0, 2);

  const content = document.getElementById('content');
  if (!cls) {
    content.innerHTML = UI.empty(ICON.users, '还没有班级，请点击左上角“选择班级”添加班级');
    return;
  }
  content.innerHTML = `
    <div class="module-header">
      <div><div class="module-title">${ICON.dashboard} 仪表盘</div>
      <div class="module-subtitle">${cls.name} · 数据总览</div></div>
    </div>

    <div class="grid grid-4 mb-4">
      <div class="stat-card green" style="cursor:pointer" onclick="App.navigate('recitation')" title="点击进入背书统计">
        <div class="stat-icon green">${ICON.recitation}</div>
        <div><div class="stat-value">${recDone}</div><div class="stat-label">已背页数</div></div>
        <div class="stat-rate">${recRate}%</div>
      </div>
      <div class="stat-card amber ${M._tabs.dashExpand==='homework'?'stat-card-active':''}" style="cursor:pointer" onclick="event.stopPropagation();M._tabs.dashExpand=M._tabs.dashExpand==='homework'?'':'homework';M.dashboard()" title="点击展开进行中的作业">
        <div class="stat-icon amber">${ICON.homework}</div>
        <div><div class="stat-value">${pendingHw}</div><div class="stat-label">进行中作业</div></div>
      </div>
      <div class="stat-card blue ${M._tabs.dashExpand==='todo'?'stat-card-active':''}" style="cursor:pointer" onclick="M._tabs.dashExpand=M._tabs.dashExpand==='todo'?'':'todo';M.dashboard()" title="点击展开待办事项">
        <div class="stat-icon blue">${ICON.todo}</div>
        <div><div class="stat-value">${pendingTodo}</div><div class="stat-label">待办事项</div></div>
      </div>
      <div class="stat-card purple ${M._tabs.dashExpand==='teacherKit'?'stat-card-active':''}" style="cursor:pointer" onclick="M._tabs.dashExpand=M._tabs.dashExpand==='teacherKit'?'':'teacherKit';M.dashboard()" title="点击展开教师锦囊">
        <div class="stat-icon purple">${ICON.teacherKit}</div>
        <div><div class="stat-value">AI</div><div class="stat-label">教师锦囊</div></div>
      </div>
    </div>

    <!-- 内联展开区：待办事项 -->
    ${M._tabs.dashExpand==='todo' ? `<div class="dash-expand-section">
      <div class="card" style="border:2px solid var(--info);border-left:4px solid var(--info)">
        <div class="flex items-center justify-between mb-3">
          <div class="card-title" style="margin:0">${ICON.todo} 待办事项</div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-primary btn-sm" onclick="dashAddTodo(event)">${ICON.plus} 添加</button>
            <button class="btn btn-ghost btn-sm" onclick="M._tabs.dashExpand='';M.dashboard()">收起</button>
          </div>
        </div>
        ${todos.filter(t=>!t.done).length ? todos.filter(t=>!t.done).map(t => `<div class="checkbox-item">
          <div class="custom-checkbox" onclick="dashToggleTodo('${t.id}',event)">${ICON.check}</div>
          <span class="todo-text">${esc(t.text)}</span>
          ${t.priority==='high'?UI.badge('紧急','red'):t.priority==='medium'?UI.badge('一般','amber'):''}
          <span class="text-sm text-muted">${t.due||''}</span>
          <button class="btn btn-danger btn-sm" onclick="dashDelTodo('${t.id}',event)">删除</button>
        </div>`).join('') : '<div class="text-sm text-muted" style="padding:12px 0">暂无待办</div>'}
        ${todos.filter(t=>t.done).length ? `<div class="divider"></div><div class="text-sm text-muted mb-2">已完成</div>
        ${todos.filter(t=>t.done).map(t => `<div class="checkbox-item">
          <div class="custom-checkbox checked" onclick="dashToggleTodo('${t.id}',event)">${ICON.check}</div>
          <span class="todo-text done">${esc(t.text)}</span>
          <button class="btn btn-danger btn-sm" onclick="dashDelTodo('${t.id}',event)">删除</button>
        </div>`).join('')}` : ''}
      </div>
    </div>` : ''}

    <!-- 内联展开区：教师锦囊 -->
    ${M._tabs.dashExpand==='teacherKit' ? `<div class="dash-expand-section">
      <div class="card" style="border:2px solid var(--primary);border-left:4px solid var(--primary)">
        <div class="flex items-center justify-between mb-3">
          <div class="card-title" style="margin:0">${ICON.teacherKit} 教师锦囊</div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-ghost btn-sm" onclick="App.navigate('teacherKit')">进入完整版</button>
            <button class="btn btn-ghost btn-sm" onclick="M._tabs.dashExpand='';M.dashboard()">收起</button>
          </div>
        </div>
        ${tabBar([
          {group:'dashKitTab',id:'management',label:'班级管理难题'},
          {group:'dashKitTab',id:'parentReply',label:'家长高情商回复'}
        ], M._tabs.dashKitTab||'management')}
        <div class="tk-list" style="max-height:420px;overflow-y:auto">
          ${(TEACHER_KIT_DATA[M._tabs.dashKitTab||'management']||[]).map((item,idx) => {
            const active = M._tabs.dashKitQ===idx;
            return `<div class="tk-item ${active?'active':''}">
              <div class="tk-q" onclick="M._tabs.dashKitQ=${active?'null':idx};M._tabs.dashExpand='teacherKit';M.dashboard()">
                <span class="tk-num">${idx+1}</span>${esc(item.q)}
              </div>
              ${active ? `<div class="tk-a"><div class="tk-a-label">建议回复：</div>${esc(item.a).replace(/\\n/g,'<br>')}</div>` : ''}
            </div>`;
          }).join('')}
        </div>
        <div class="divider"></div>
        <div class="tk-custom-section">
          <div class="text-sm" style="font-weight:600;margin-bottom:8px;color:var(--text-primary)">${ICON.edit} 自由提问</div>
          <div class="tk-input-row">
            <input class="tk-custom-input" id="dashKitInput" placeholder="输入你的问题，获取AI建议..." onkeydown="if(event.key==='Enter')dashKitAsk()">
            <button class="btn btn-primary btn-sm" onclick="dashKitAsk()">${ICON.teacherKit} 问AI</button>
          </div>
          <div id="dashKitResult" style="margin-top:8px;display:none">
            <div class="tk-a" style="border:none;padding:12px;background:var(--primary-bg);border-radius:8px;margin-top:8px">
              <div class="tk-a-label">AI回复：</div>
              <div id="dashKitAnswer" style="font-size:13px;line-height:1.8;color:var(--text-secondary)"></div>
              <div style="margin-top:8px;display:flex;gap:4px;flex-wrap:wrap">
                <button class="btn btn-ghost btn-sm" onclick="dashKitCopyAnswer()">${ICON.file} 复制</button>
                <button class="btn btn-ghost btn-sm" onclick="dashKitSaveQA()">${ICON.plus} 保存到锦囊</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>` : ''}

    <!-- 内联展开区：进行中作业 -->
    ${M._tabs.dashExpand==='homework' ? `<div class="dash-expand-section">
      <div class="card" style="border:2px solid var(--warning);border-left:4px solid var(--warning)">
        <div class="flex items-center justify-between mb-3">
          <div class="card-title" style="margin:0">${ICON.homework} 进行中的作业</div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-ghost btn-sm" onclick="App.navigate('homework')">完整版</button>
            <button class="btn btn-ghost btn-sm" onclick="M._tabs.dashExpand='';M.dashboard()">收起</button>
          </div>
        </div>
        ${homework.filter(h => h.status === '进行中').length ? homework.filter(h => h.status === '进行中').map(h => {
          const cnt = h.submittedIds ? h.submittedIds.length : (h.submitted || 0);
          const rate = h.total ? Math.round(cnt / h.total * 100) : 0;
          return `<div class="list-item dash-hw-item" style="cursor:pointer" onclick="viewHomework('${h.id}')">
            <div class="badge badge-${h.type==='抄写'?'green':h.type==='朗读'?'blue':h.type==='书面'?'amber':h.type==='听力'?'purple':'gray'}">${h.type}</div>
            <div style="flex:1">
              <div style="font-weight:600;font-size:14px">${esc(h.title)}</div>
              <div class="text-sm text-muted">${h.date} · 截止 ${h.dueDate} · ${h.className||cls.name}</div>
              <div class="dash-hw-progress mt-2">
                <div class="progress-bar" style="flex:1;height:6px"><div class="progress-bar-fill" style="width:${rate}%"></div></div>
                <span class="text-sm" style="margin-left:8px;color:var(--primary-dark);white-space:nowrap">${cnt}/${h.total} (${rate}%)</span>
              </div>
            </div>
            ${UI.badge('进行中', 'amber')}
          </div>`;
        }).join('') : '<div class="text-sm text-muted" style="padding:12px 0">暂无进行中的作业</div>'}
      </div>
    </div>` : ''}

    ${todayNews.length ? `
    <div class="card mb-4" style="cursor:pointer" onclick="App.navigate('news')">
      <div class="card-title">${ICON.news} 今日教育热点</div>
      <div class="grid grid-2">
        ${todayNews.map(n => `
          <div class="flex items-start gap-2">
            <div class="badge badge-green" style="flex-shrink:0">${n.source}</div>
            <div style="flex:1">
              <div style="font-weight:600;font-size:13px;line-height:1.4">${esc(n.title)}</div>
              <div class="text-sm text-muted mt-1">${esc(n.summary)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>` : ''}

    <div class="grid grid-2 mb-4">
      <div class="card">
        <div class="card-title">${ICON.calendar} 今日安排 ${dayLabel ? '（'+dayLabel+'）' : ''}</div>
        ${todaySchedule.length ? `<div class="table-wrap"><table class="data-table">
          <thead><tr><th>时间</th><th>内容</th><th>地点/班级</th></tr></thead>
          <tbody>${todaySchedule.map(s => {
            const colorMap = { lesson:'green', duty:'purple', meal:'amber', rest:'blue', night:'cyan' };
            const color = colorMap[s.type] || 'green';
            const label = s.type === 'lesson' ? s.subject : s.subject;
            return `<tr>
              <td><span class="badge badge-${color}">${s.period || s.time}</span></td>
              <td>${esc(label)}</td>
              <td>${esc(s.class)}</td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>` : UI.empty(ICON.calendar, '今天没有安排')}
      </div>

      <div class="card">
        <div class="card-title">${ICON.records} 最近工作记录</div>
        ${records.length ? records.slice(0,5).map(r => `<div class="list-item">
          <div class="badge badge-${r.type==='备课'?'green':r.type==='教研'?'blue':r.type==='听课'?'purple':r.type==='批改'?'amber':'gray'}">${r.type}</div>
          <div style="flex:1"><div style="font-weight:600;font-size:13px">${esc(r.title)}</div>
          <div class="text-sm text-muted">${r.date} ${r.time}</div></div>
        </div>`).join('') : UI.empty(ICON.records, '暂无记录')}
      </div>
    </div>

    <div class="card">
      <div class="card-title">${ICON.grid} 快捷操作</div>
      <div class="quick-actions">
        ${[
          {mod:'schedule',icon:'schedule',label:'查看课表'},
          {mod:'students',icon:'students',label:'学生花名册'},
          {mod:'grades',icon:'grades',label:'成绩录入'},
          {mod:'homework',icon:'homework',label:'布置作业'},
          {mod:'lesson',icon:'lesson',label:'教案备课'},
          {mod:'recitation',icon:'recitation',label:'背书记录'},
          {mod:'teacherKit',icon:'teacherKit',label:'教师锦囊'},
          {mod:'todo',icon:'todo',label:'待办事项'},
        ].map(a => `<div class="quick-action" onclick="App.navigate('${a.mod}')">${ICON[a.icon]}<span>${a.label}</span></div>`).join('')}
      </div>
    </div>
  `;
  } catch(e) {
    document.getElementById('content').innerHTML = `<div style="padding:40px;color:red"><h3>仪表盘渲染出错</h3><pre>${esc(e.stack)}</pre></div>`;
  }
};

/* ===== 仪表盘内联辅助函数 ===== */
function dashAddTodo(e) { e.stopPropagation();
  UI.modal('添加待办', `
    <div class="form-group"><label class="form-label">内容</label><input class="form-input" id="dash-td-text" placeholder="待办内容"></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">优先级</label><select class="form-select" id="dash-td-priority"><option value="high">紧急</option><option value="medium" selected>一般</option><option value="low">低</option></select></div>
      <div class="form-group"><label class="form-label">截止日期</label><input class="form-input" id="dash-td-due" type="date" value="${todayStr()}"></div>
    </div>
  `, `<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button>
     <button class="btn btn-primary" onclick="dashSaveTodo()">添加</button>`);
}
function dashSaveTodo() {
  Store.gd('todos').unshift({
    id: Store.uid(), text: document.getElementById('dash-td-text').value,
    done: false, priority: document.getElementById('dash-td-priority').value,
    due: document.getElementById('dash-td-due').value
  });
  Store.save(); UI.closeModal(); M.dashboard(); UI.toast('已添加');
}
function dashToggleTodo(id, e) { e.stopPropagation();
  const t = Store.gd('todos').find(x=>x.id===id);
  if(t){t.done=!t.done;Store.save();M.dashboard();}
}
function dashDelTodo(id, e) { e.stopPropagation();
  const arr = Store.gd('todos'); const idx = arr.findIndex(t=>t.id===id);
  if(idx>=0){arr.splice(idx,1);Store.save();M.dashboard();UI.toast('已删除');}
}

/* 仪表盘内联教师锦囊AI提问 */
let _dashKitLastAnswer = '';
function dashKitAsk() {
  const input = document.getElementById('dashKitInput');
  const q = (input.value||'').trim();
  if(!q) return;
  const resultEl = document.getElementById('dashKitResult');
  const answerEl = document.getElementById('dashKitAnswer');
  resultEl.style.display = 'block';
  answerEl.innerHTML = '<span style="color:var(--text-tertiary)">思考中...</span>';
  setTimeout(() => {
    const a = generateAIResponse(q, M._tabs.dashKitTab||'management');
    _dashKitLastAnswer = a;
    answerEl.innerHTML = a.replace(/\n/g,'<br>');
  }, 600);
}
function dashKitCopyAnswer() {
  const text = _dashKitLastAnswer || document.getElementById('dashKitAnswer').innerText;
  navigator.clipboard.writeText(text).then(()=>UI.toast('已复制')).catch(()=>UI.toast('复制失败'));
}
function dashKitSaveQA() {
  const q = (document.getElementById('dashKitInput').value||'').trim();
  if(!q || !_dashKitLastAnswer) return;
  const custom = Store.gd('customKitQA');
  custom.unshift({id:Store.uid(),q:q,a:_dashKitLastAnswer,date:todayStr(),category:M._tabs.dashKitTab||'management'});
  Store.save();
  document.getElementById('dashKitInput').value = '';
  document.getElementById('dashKitResult').style.display = 'none';
  _dashKitLastAnswer = '';
  UI.toast('已保存到教师锦囊');
}

/* ===== AI回复生成器 ===== */
function generateAIResponse(question, category) {
  const q = question.toLowerCase();
  // 关键词匹配现有锦囊
  const allData = [...(TEACHER_KIT_DATA.management||[]), ...(TEACHER_KIT_DATA.parentReply||[])];
  let bestMatch = null; let bestScore = 0;
  allData.forEach(item => {
    const kw = item.q.toLowerCase();
    let score = 0;
    const words = q.replace(/[，。！？、；：""''（）\s]/g,'').split('');
    const kwWords = kw.replace(/[，。！？、；：""''（）\s]/g,'').split('');
    words.forEach(w => { if(kwWords.includes(w)) score++; });
    if(score > bestScore) { bestScore = score; bestMatch = item; }
  });

  if(bestMatch && bestScore >= 3) {
    return bestMatch.a;
  }

  // 智能模板回复
  const templates = {
    纪律: '针对班级纪律问题，建议从以下方面入手：\n\n1. 建立清晰规则：开学初与学生共同制定课堂公约，形成班级共识。\n2. 正向激励为主：设立"纪律之星"等奖励机制，让学生有动力遵守纪律。\n3. 分层处理：轻微违纪用眼神提醒或走近暗示；多次违纪课后单独谈话。\n4. 关注原因：有时纪律问题源于课程难度不匹配，及时调整教学节奏。\n5. 家校协同：必要时联系家长，共同制定管理方案。\n\n建议从现在开始试行，坚持两周会有明显改善。',
    作业: '关于作业管理的问题，可以参考以下策略：\n\n1. 分层布置：针对不同水平学生设置必做题和选做题，让每个学生都能完成。\n2. 及时反馈：作业第二天批改发回，让学生感受到被重视。\n3. 建立责任制：小组长负责检查、记录，老师抽查。\n4. 家校联动：连续3次未交联系家长，共同督促。\n5. 趣味性：适当加入绘本阅读、英语趣配音等多样化任务。\n\n关键在于让学生感受到做作业的意义，而非负担。',
    家长沟通: '与家长沟通时建议遵循以下原则：\n\n1. 先肯定再建议：认可家长的关心和孩子的优点。\n2. 用事实说话：提供具体的行为描述而非笼统评价。\n3. 给明确建议：告诉家长在家可以做什么具体配合。\n4. 保持专业温和：客观描述，不情绪化。\n5. 定期反馈：让家长看到持续的进步。\n\n良好的家校关系需要日积月累的信任建立，每次沟通都是机会。',
    教学方法: '关于教学方法的建议：\n\n1. 情境教学：将英语知识融入真实生活情境，提高语言运用能力。\n2. 任务驱动：每节课设计明确的任务目标，让学生带着目的学习。\n3. 分层设计：同一内容设计基础、提高、拓展三个层次的问题和练习。\n4. 多模态输入：结合图片、音频、视频等多种方式呈现语言材料。\n5. 即时评价：课堂上及时给予正面反馈，增强学生自信心。\n\n小学英语教学重在兴趣培养和习惯养成，循序渐进最重要。',
    后进生: '帮助后进生提升的建议：\n\n1. 降低期望门槛：先从最简单的任务开始，让ta体验到成功的喜悦。\n2. 及时表扬：哪怕很小的进步也要当众表扬，建立自信心。\n3. 安排小助手：让友善的优生一对一帮助，同伴影响效果很好。\n4. 联系家长：沟通时先肯定孩子优点，再提建议，形成正向循环。\n5. 兴趣切入：从孩子感兴趣的话题（游戏、动漫等）引入英语学习。\n\n后进生的转变需要耐心，每个孩子都有自己的成长节奏。',
    default: '感谢你的提问！作为一名小学英语教师，这个问题确实很关键。\n\n建议从以下几个方面考虑：\n1. 先分析问题的具体原因和背景\n2. 参考同行经验或学科教研组讨论\n3. 制定具体的行动计划并分步实施\n4. 及时记录和反思，调整策略\n\n如果方便的话，可以提供更多具体信息，我可以给出更有针对性的建议。\n\n也欢迎在WorkBuddy中直接向我提问，获取更详细的AI辅导！'
  };

  const keys = Object.keys(templates);
  for(const k of keys) {
    if(q.includes(k)) return templates[k];
  }

  // 按关键词分类回复
  if(/上课|课堂|讲话|走神|注意力|纪律/.test(q)) return templates.纪律;
  if(/作业|练习|任务|完成/.test(q)) return templates.作业;
  if(/家长|联系|沟通|回复/.test(q)) return templates.家长沟通;
  if(/怎么教|方法|教学设计|教案|课程/.test(q)) return templates.教学方法;
  if(/差|后进|跟不上|基础差|学困/.test(q)) return templates.后进生;

  return templates.default;
}

/* ============================================================
 * 2. 我的课表
 * ============================================================ */
M.schedule = function() {
  const tab = M._tabs.schedule || 'mine';
  const cls = Store.getCurrentClass();
  const schedule = getSchedule();

  let tabContent = '';

  if (tab === 'mine') {
    // 我的课表（按天分组，按时间从早到晚排序）
    const days = ['周一','周二','周三','周四','周五'];
    const byDay = {};
    days.forEach(d => byDay[d] = []);
    schedule.forEach(s => { if (byDay[s.day]) byDay[s.day].push(s); });
    days.forEach(d => byDay[d].sort((a,b) => a.time.localeCompare(b.time)));

    // 将每天课程与值日/餐管/午休/晚托合并，统一按时间排序
    // 顺序定义：早餐→第1节→课间→第2节→...→第4节→午餐→午休→第5节→第6节→晚托
    const timeOrder = {
      '早餐/午餐': 0, '8:20-9:00': 1, '课间': 2, '9:15-9:55': 3,
      '10:25-11:05': 4, '11:20-12:00': 5, '午餐': 6, '午休': 7,
      '14:15-14:55': 8, '15:10-15:50': 9, '晚托': 10
    };

    let html = '';
    days.forEach(d => {
      const items = [...byDay[d]];
      items.sort((a,b) => (timeOrder[a.time]||99) - (timeOrder[b.time]||99));

      const hasLessons = items.some(s => s.type === 'lesson');

      html += `<div class="card mb-3">
        <div class="card-title" style="display:flex;align-items:center;justify-content:space-between">
          <span>${ICON.calendar} ${d}</span>
          <span class="text-sm text-muted">${items.length} 项</span>
        </div>`;

      if (!hasLessons) {
        html += `<div class="text-sm text-muted" style="padding:8px 0">今日无课程安排</div>`;
      }

      // 课程项（纯课程，不含值日/餐管/午休/晚托）
      const lessons = items.filter(s => s.type === 'lesson');
      if (lessons.length) {
        html += `<div class="schedule-timeline">`;
        lessons.forEach(s => {
          const colorMap = { '英语':'green', '数学':'blue', '语文':'red', '道德与法治':'purple', '道法':'purple', '科学':'cyan', '音乐':'pink', '美术':'amber', '体育':'red', '阅读':'gray', '班会':'blue', '综合':'gray' };
          const color = colorMap[s.subject] || 'green';
          const [start, end] = (s.time||'').split('-');
          html += `<div class="schedule-row" onclick="editScheduleLesson('${s.id}')" title="点击编辑课程">
            <div class="schedule-time">
              <span class="schedule-time-start">${start||''}</span>
              <span class="schedule-time-end">${end||''}</span>
            </div>
            <div class="schedule-period">${s.period||''}</div>
            <div class="schedule-subject badge badge-${color}">${esc(s.subject)}</div>
            <div class="schedule-class">${esc(s.class)}</div>
          </div>`;
        });
        html += `</div>`;
      }

      // 值日/餐管/午休/晚托项（单独分组）
      const extras = items.filter(s => s.type !== 'lesson');
      if (extras.length) {
        html += `<div class="schedule-extras">`;
        extras.forEach(s => {
          const extraColor = s.type === 'duty' ? 'purple' : s.type === 'meal' ? 'amber' : s.type === 'rest' ? 'blue' : 'cyan';
          const extraLabel = s.type === 'duty' ? '值日' : s.type === 'meal' ? '餐管' : s.type === 'rest' ? '午休' : '晚托';
          html += `<div class="schedule-row schedule-extra-row">
            <div class="schedule-time schedule-time-extra">${s.time}</div>
            <div class="schedule-period">${s.period||''}</div>
            <div class="schedule-subject badge badge-${extraColor}" style="opacity:0.8">${extraLabel}</div>
            <div class="schedule-class text-sm text-muted">${esc(s.class)}</div>
          </div>`;
        });
        html += `</div>`;
      }

      html += `</div>`;
    });

    tabContent = html + `
      <div class="mt-3">
        <button class="btn btn-outline" onclick="exportScheduleWord()">${ICON.download} 导出我的课表</button>
      </div>`;
  } else if (tab === 'class') {
    // 班级课表（横向网格）- 按时间从早到晚排序
    const timeOrder = { '8:20-9:00':1, '9:15-9:55':2, '10:25-11:05':3, '11:20-12:00':4, '14:15-14:55':5, '15:10-15:50':6, '课间':7, '早餐/午餐':8, '午休':9, '晚托':10 };
    const sortTime = (a,b) => (timeOrder[a]||99) - (timeOrder[b]||99);
    const times = [...new Set(schedule.map(s => s.time))].sort(sortTime);
    const days = ['周一','周二','周三','周四','周五'];
    // 提取班级名称（去掉年级），用于标题
    const className = (cls.name||'').replace(/[一二三四五六]([（(])/,'').replace(/[）)]/,'');

    let grid = `<div class="schedule-grid"><div class="schedule-cell header">时间</div>`;
    days.forEach(d => grid += `<div class="schedule-cell header">${d}</div>`);
    times.forEach(t => {
      grid += `<div class="schedule-cell time">${t}</div>`;
      days.forEach(d => {
        const cell = schedule.find(s => s.time === t && s.day === d);
        if (cell && cell.subject) {
          const colorMap = { '英语':'green', '数学':'blue', '语文':'red', '道德与法治':'purple', '道法':'purple', '科学':'cyan', '音乐':'pink', '美术':'amber', '体育':'red', '阅读':'gray', '班会':'blue', '综合':'gray', '值日':'purple', '餐管':'amber', '午休':'blue', '晚托':'cyan' };
          const color = colorMap[cell.subject] || 'green';
          grid += `<div class="schedule-cell lesson" onclick="editScheduleLesson('${cell.id}')">
            <span class="subject">${esc(cell.subject)}</span>
            <span class="class-label">${esc(cell.class||cls.name)}</span></div>`;
        } else {
          grid += `<div class="schedule-cell"></div>`;
        }
      });
    });
    grid += `</div>`;

    tabContent = grid;
  } else if (tab === 'swap') {
    const swaps = Store.gd('classSwaps');
    tabContent = `
      <div class="mb-3">
        <button class="btn btn-primary" onclick="addClassSwap()">${ICON.plus} 记录调课</button>
      </div>
      ${swaps.length ? `<div class="table-wrap"><table class="data-table">
        <thead><tr><th>日期</th><th>原安排</th><th>调至</th><th>原因</th><th>操作</th></tr></thead>
        <tbody>${swaps.map(s => `<tr>
          <td>${s.date}</td><td>${esc(s.from)}</td><td>${esc(s.to)}</td><td>${esc(s.reason)}</td>
          <td><button class="btn btn-primary btn-sm" onclick="editClassSwap('${s.id}')">编辑</button><button class="btn btn-danger btn-sm" onclick="delClassSwap('${s.id}')">删除</button></td>
        </tr>`).join('')}</tbody>
      </table></div>` : UI.empty(ICON.schedule, '暂无调课记录')}`;
  }

  document.getElementById('content').innerHTML = `
    <div class="module-header">
      <div><div class="module-title">${ICON.schedule} 我的课表</div>
      <div class="module-subtitle">唐楚儿 · ${cls.name}</div></div>
    </div>
    ${tabBar([
      {group:'schedule',id:'mine',label:'我的课表'},
      {group:'schedule',id:'class',label:'班级课表'},
      {group:'schedule',id:'swap',label:'调课管理'}
    ], tab)}
    ${tabContent}
  `;
};

function editScheduleLesson(id) {
  const schedule = getSchedule();
  const cell = schedule.find(s => s.id === id);
  if (!cell) return;
  const subjects = ['英语','数学','语文','科学','音乐','美术','体育','阅读','班会','综合','道德与法治',''];
  const classes = ['五（1）班','五（2）班','二（1）班','二（2）班','三（1）班','三（2）班','四（1）班','四（2）班','六（1）班','六（2）班'];
  UI.modal(`编辑课程 - ${cell.day} ${cell.time}`, `
    <div class="form-row">
      <div class="form-group"><label class="form-label">科目</label>
      <select class="form-select" id="sch-subject">${subjects.map(s=>`<option value="${s}" ${s===cell.subject?'selected':''}>${s||'（无）'}</option>`).join('')}</select></div>
      <div class="form-group"><label class="form-label">班级</label>
      <select class="form-select" id="sch-class">${classes.map(c=>`<option value="${c}" ${c===cell.class?'selected':''}>${c}</option>`).join('')}</select></div>
    </div>
    <div class="form-group"><label class="form-label">备注</label>
    <input class="form-input" id="sch-note" value="${esc(cell.note||'')}" placeholder="选填"></div>
  `, `<button class="btn btn-danger" onclick="delScheduleLesson('${cell.id}')">删除</button>
     <button class="btn btn-primary" onclick="saveScheduleLesson('${cell.id}')">保存</button>`);
}

function saveScheduleLesson(id) {
  const cell = getSchedule().find(s => s.id === id);
  if (!cell) return;
  cell.subject = document.getElementById('sch-subject').value;
  cell.class = document.getElementById('sch-class').value;
  cell.note = document.getElementById('sch-note').value;
  Store.save();
  UI.closeModal();
  M.schedule();
  UI.toast('已保存');
}

function addClassSwap() {
  const now = new Date();
  const today = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
  UI.modal('记录调课', `
    <div class="form-row">
      <div class="form-group"><label class="form-label">日期</label><input class="form-input" id="cs-date" type="date" value="${today}"></div>
      <div class="form-group"><label class="form-label">原因（选填）</label><input class="form-input" id="cs-reason" placeholder="如：教研活动冲突"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">原安排</label><input class="form-input" id="cs-from" placeholder="如：周三第3节"></div>
      <div class="form-group"><label class="form-label">调至</label><input class="form-input" id="cs-to" placeholder="如：周四第5节"></div>
    </div>
  `, `<button class="btn btn-primary" onclick="saveClassSwap()">保存</button>`);
}

function editClassSwap(id) {
  const swaps = Store.gd('classSwaps');
  const s = swaps.find(x => x.id === id);
  if (!s) return;
  UI.modal('编辑调课', `
    <div class="form-row">
      <div class="form-group"><label class="form-label">日期</label><input class="form-input" id="cs-date" type="date" value="${s.date}"></div>
      <div class="form-group"><label class="form-label">原因</label><input class="form-input" id="cs-reason" value="${esc(s.reason||'')}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">原安排</label><input class="form-input" id="cs-from" value="${esc(s.from)}"></div>
      <div class="form-group"><label class="form-label">调至</label><input class="form-input" id="cs-to" value="${esc(s.to)}"></div>
    </div>
  `, `<button class="btn btn-danger" onclick="delClassSwap('${s.id}')">删除</button><button class="btn btn-primary" onclick="saveClassSwap('${s.id}')">保存</button>`);
}

function saveClassSwap(id) {
  const swaps = Store.gd('classSwaps');
  const date = document.getElementById('cs-date').value;
  const fromV = document.getElementById('cs-from').value.trim();
  const toV = document.getElementById('cs-to').value.trim();
  const reason = document.getElementById('cs-reason').value.trim();
  if (!date || !fromV || !toV) { UI.toast('请填写日期、原安排和调至'); return; }
  if (id) {
    const s = swaps.find(x => x.id === id);
    if (s) { s.date = date; s.from = fromV; s.to = toV; s.reason = reason; }
  } else {
    swaps.unshift({ id: Store.uid(), date, from: fromV, to: toV, reason });
  }
  Store.save();
  UI.closeModal();
  M.schedule();
  UI.toast(id ? '已更新' : '已记录');
}

function delClassSwap(id) {
  const swaps = Store.gd('classSwaps');
  const idx = swaps.findIndex(s => s.id === id);
  if (idx >= 0) { swaps.splice(idx, 1); Store.save(); UI.closeModal(); M.schedule(); UI.toast('已删除'); }
}

/* ============================================================
 * 2.5. 课程总表（全校）
 * ============================================================ */
M.masterSchedule = function() {
  const ms = window.MASTER_SCHEDULE;
  if (!ms) return;
  const days = ['周一','周二','周三','周四','周五'];
  const periods = ms.periods;
  const grades = {
    '一': ['一(1)', '一(2)'],
    '二': ['二（1）', '二（2）'],
    '三': ['三（1）', '三（2）'],
    '四': ['四（1)', '四（2）'],
    '五': ['五（1）', '五（2）'],
    '六': ['六（1）', '六（2）']
  };
  const viewGrade = M._tabs.masterSchedule || '全校';
  const gradeKeys = ['全校','一','二','三','四','五','六'];

  const isTang = (subject) => subject && subject.includes('唐楚儿');

  // Render one grade: periods as rows, days as columns, each cell shows both classes
  const renderGradeTable = (gradeClasses) => {
    const c1 = gradeClasses[0], c2 = gradeClasses[1];
    return `<div class="table-wrap" style="overflow-x:auto">
      <table class="data-table" style="min-width:560px">
        <thead><tr>
          <th style="min-width:70px">节次</th>
          ${days.map(d => `<th colspan="2" style="text-align:center;border-bottom:1px solid var(--border-light)">${d}</th>`).join('')}
        </tr><tr>
          <th></th>
          ${days.map(() => `<th style="font-size:11px;font-weight:600;color:var(--text-tertiary);padding:4px 8px">${c1}</th><th style="font-size:11px;font-weight:600;color:var(--text-tertiary);padding:4px 8px">${c2}</th>`).join('')}
        </tr></thead>
        <tbody>
          ${periods.map(p => {
            const dayCells = days.map(day => {
              const s1 = (ms.schedule[c1] && ms.schedule[c1][day] && ms.schedule[c1][day][p.id]) || '';
              const s2 = (ms.schedule[c2] && ms.schedule[c2][day] && ms.schedule[c2][day][p.id]) || '';
              const renderCell = (s) => {
                if (!s || s === 'null') return '<span style="color:#d1d5db">—</span>';
                return `<span style="${isTang(s)?'color:var(--primary-dark);font-weight:700;':''}font-size:12px">${esc(s)}</span>`;
              };
              return `<td style="vertical-align:top;padding:8px">${renderCell(s1)}</td><td style="vertical-align:top;padding:8px">${renderCell(s2)}</td>`;
            }).join('');
            return `<tr><td style="font-weight:700;color:var(--text-secondary);white-space:nowrap;padding:8px">${p.label}<br><span style="font-size:11px;color:var(--text-tertiary)">${p.time}</span></td>${dayCells}</tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
  };

  let html = '';
  if (viewGrade === '全校') {
    Object.entries(grades).forEach(([grade, gradeClasses]) => {
      html += `<div class="card mb-3">
        <div class="card-title">${esc(grade)}年级</div>
        ${renderGradeTable(gradeClasses)}
      </div>`;
    });
  } else {
    const gradeClasses = grades[viewGrade] || [];
    html = `<div class="card mb-3">
      ${renderGradeTable(gradeClasses)}
    </div>`;
  }

  // Chloe's courses summary
  html += `<div class="card">
    <div class="card-title">${ICON.user} Chloe（唐楚儿）的任教课程一览</div>
    <div class="grid grid-3">
      ${Object.entries(ms.teacher_tang || {}).map(([key, val]) => `
        <div class="stat-card green">
          <div class="stat-icon green">${ICON.book}</div>
          <div>
            <div class="stat-value" style="font-size:14px">${val.time}</div>
            <div class="stat-label">${key} · ${val.class}班 · ${val.subject.replace(/（唐楚儿[）)]?/,'').replace('英语','英语').replace('道德与法治','道法')}</div>
          </div>
        </div>
      `).join('')}
    </div>
  </div>`;

  document.getElementById('content').innerHTML = `
    <div class="module-header">
      <div><div class="module-title">${ICON.grid} 课程总表</div>
      <div class="module-subtitle">宝月小学 · 全校12班</div></div>
    </div>
    ${tabBar(gradeKeys.map(g => ({group:'masterSchedule',id:g,label:g=== '全校'?'全校总表':g+'年级'})), viewGrade)}
    <div class="mt-3">
      ${viewGrade === '全校' ? '<div class="text-sm text-muted mb-3">' + ICON.info + ' 绿色高亮 = 唐楚儿（Chloe）的课</div>' : ''}
      ${html}
    </div>
  `;
};

/* ============================================================
 * 3. 背书统计（按书本页数）
 * ============================================================ */
const RECITATION_BOOK = [
  { unit: 'Unit 1', pages: ['P2','P3','P4','P5','P6','P7','P8','P9','P10','P11'] },
  { unit: 'Unit 2', pages: ['P12','P13','P14','P15','P16','P17','P18','P19','P20','P21'] },
  { unit: 'Unit 3', pages: ['P22','P23','P24','P25','P26','P27','P28','P29','P30','P31'] },
  { unit: 'Unit 4', pages: ['P32','P33','P34','P35','P36','P37','P38','P39','P40','P41'] },
  { unit: 'Unit 5', pages: ['P42','P43','P44','P45','P46','P47','P48','P49','P50','P51'] },
  { unit: 'Unit 6', pages: ['P52','P53','P54','P55','P56','P57','P58','P59','P60','P61'] },
  { unit: 'R1', pages: ['P62','P63','P64','P65','P66'] },
  { unit: 'R2', pages: ['P67','P68','P69','P70','P71'] },
];

const RECITATION_STATUS = [
  { id: 'pass', label: '已背', text: '✓', color: '#22c55e' },
  { id: 'fail', label: '未背', text: '✗', color: '#ef4444' },
  { id: 'partial', label: '部分', text: '△', color: '#f59e0b' },
  { id: 'none', label: '未登', text: '-', color: '#f3f4f6' }
];

function findRecRecord(unit, page, studentId) {
  return Store.cd('recitation').find(r => r.unit === unit && r.page === page && r.studentId === studentId);
}

function setRecStatus(unit, page, studentId, status) {
  const records = Store.cd('recitation');
  let rec = findRecRecord(unit, page, studentId);
  const students = getStudents();
  const stu = students.find(s => s.id === studentId);
  if (!stu) return;
  if (status === 'none') {
    const idx = records.findIndex(r => r.unit === unit && r.page === page && r.studentId === studentId);
    if (idx >= 0) records.splice(idx, 1);
  } else {
    if (!rec) {
      rec = { id: Store.uid(), unit, page, studentId, studentName: stu.name, status, date: todayStr(), score: 0, remark: '' };
      records.push(rec);
    } else {
      rec.status = status;
      rec.date = todayStr();
    }
  }
  Store.save();
  const stLabel = RECITATION_STATUS.find(x => x.id === status)?.label || '未登';
  UI.toast(`${stu.name}：${stLabel}`);
}

M.recitation = function() {
  const view = M._tabs.recitation || 'bypage';
  const cls = Store.getCurrentClass();
  const students = getStudents();
  const records = Store.cd('recitation');
  let tabContent = '';

  if (view === 'bypage') {
    const unit = M._tabs.recUnit || RECITATION_BOOK[0].unit;
    const page = M._tabs.recPage || RECITATION_BOOK[0].pages[0];
    const book = RECITATION_BOOK.find(b => b.unit === unit);
    const pageRecords = records.filter(r => r.unit === unit && r.page === page);
    const stats = {
      pass: pageRecords.filter(r => r.status === 'pass').length,
      fail: pageRecords.filter(r => r.status === 'fail').length,
      partial: pageRecords.filter(r => r.status === 'partial').length,
      none: students.length - pageRecords.filter(r => r.status !== 'none').length
    };

    tabContent = `
      <div class="card mb-3">
        <div class="card-title">${ICON.book} 选择页码</div>
        <div class="rec-unit-tabs">
          ${RECITATION_BOOK.map(b => `<div class="rec-unit-tab ${b.unit===unit?'active':''}" onclick="M._tabs.recUnit='${b.unit}';M._tabs.recPage='${b.pages[0]}';M.recitation()">${b.unit}</div>`).join('')}
        </div>
        <div class="rec-page-tabs mt-2">
          ${book.pages.map(p => `<div class="rec-page-tab ${p===page?'active':''}" onclick="M._tabs.recPage='${p}';M.recitation()">${p}</div>`).join('')}
        </div>
      </div>
      <div class="grid grid-4 mb-3">
        <div class="stat-card green"><div class="stat-icon green">${ICON.success}</div><div><div class="stat-value">${stats.pass}</div><div class="stat-label">已背</div></div></div>
        <div class="stat-card red"><div class="stat-icon red">${ICON.close}</div><div><div class="stat-value">${stats.fail}</div><div class="stat-label">未背</div></div></div>
        <div class="stat-card amber"><div class="stat-icon amber">${ICON.alert}</div><div><div class="stat-value">${stats.partial}</div><div class="stat-label">部分</div></div></div>
        <div class="stat-card gray"><div class="stat-icon gray">${ICON.clock}</div><div><div class="stat-value">${stats.none}</div><div class="stat-label">未登</div></div></div>
      </div>
      <div class="card">
        <div class="card-title">${unit} · ${page} · 全班背书情况</div>
        <div class="rec-grid">
          ${students.map(s => {
            const rec = pageRecords.find(r => r.studentId === s.id);
            const status = rec ? rec.status : 'none';
            const st = RECITATION_STATUS.find(x => x.id === status);
            return `<div class="rec-cell" style="background:${st.color};color:${status==='none'?'#374151':'#fff'};border:${status==='none'?'1px solid #d1d5db':'1px solid transparent'}" onclick="cycleRecStatus('${unit}','${page}','${s.id}')" title="${s.no}. ${s.name} - ${st.label}">
              <div class="rec-cell-no">${s.no}</div>
              <div class="rec-cell-name">${esc(s.name)}</div>
              <div class="rec-cell-status">${st.text}</div>
            </div>`;
          }).join('')}
        </div>
        <div class="text-sm text-muted mt-3">${ICON.info} 点击学生格子切换状态：<span class="badge badge-gray" style="margin:0 4px">未登</span>→<span class="badge badge-green" style="margin:0 4px">已背</span>→<span class="badge badge-amber" style="margin:0 4px">部分</span>→<span class="badge badge-red" style="margin:0 4px">未背</span>→<span class="badge badge-gray" style="margin:0 4px">未登</span></div>
      </div>
    `;
  } else if (view === 'bystudent') {
    const sid = M._tabs.recStudent || students[0].id;
    const stu = students.find(s => s.id === sid);
    tabContent = `
      <div class="card mb-3">
        <div class="card-title">${ICON.user} 选择学生</div>
        <select class="form-select" onchange="M._tabs.recStudent=this.value;M.recitation()">
          ${students.map(s => `<option value="${s.id}" ${s.id===sid?'selected':''}>${s.no}. ${esc(s.name)}</option>`).join('')}
        </select>
      </div>
      ${stu ? `<div class="card">
        <div class="card-title">${stu.no}. ${esc(stu.name)} · 全部背书情况</div>
        <div class="rec-student-table">
        ${RECITATION_BOOK.map(book => `
          <div class="rec-student-row">
            <div class="rec-student-unit">${book.unit}</div>
            <div class="rec-student-pages">
              ${book.pages.map(p => {
                const rec = records.find(r => r.studentId === sid && r.unit === book.unit && r.page === p);
                const status = rec ? rec.status : 'none';
                const st = RECITATION_STATUS.find(x => x.id === status);
                return `<div class="rec-student-cell" style="background:${st.color};color:${status==='none'?'#374151':'#fff'};border:${status==='none'?'1px solid #d1d5db':'1px solid transparent'}" onclick="cycleRecStatus('${book.unit}','${p}','${sid}')" title="${book.unit} ${p} - ${st.label}">
                  <div class="rec-page-name">${p}</div>
                  <div class="rec-page-status">${st.text}</div>
                </div>`;
              }).join('')}
            </div>
          </div>
        `).join('')}
        </div>
        <div class="text-sm text-muted mt-3">${ICON.info} 点击格子切换该生该页的状态</div>
      </div>` : ''}
    `;
  } else if (view === 'records') {
    tabContent = `
      <div class="mb-3 flex items-center gap-2">
        <button class="btn btn-outline" onclick="exportRecitationWord()">${ICON.download} 导出Word</button>
        <span class="text-sm text-muted">共 ${records.length} 条记录</span>
      </div>
      ${records.length ? `<div class="table-wrap"><table class="data-table">
        <thead><tr><th>学生</th><th>Unit</th><th>页码</th><th>状态</th><th>日期</th><th>评分</th><th>评语</th><th>操作</th></tr></thead>
        <tbody>${records.slice().reverse().map(r => {
          const st = RECITATION_STATUS.find(x => x.id === r.status) || RECITATION_STATUS[3];
          return `<tr>
            <td>${esc(r.studentName)}</td><td>${esc(r.unit)}</td><td>${esc(r.page)}</td>
            <td><span class="badge badge-${r.status==='pass'?'green':r.status==='fail'?'red':r.status==='partial'?'amber':'gray'}">${st.label}</span></td>
            <td>${r.date}</td><td>${'★'.repeat(r.score||0)}${'☆'.repeat(5-(r.score||0))}</td>
            <td>${esc(r.remark||'')}</td>
            <td>
              <button class="btn btn-ghost btn-sm" onclick="editRecRemark('${r.id}')">${ICON.edit}</button>
              <button class="btn btn-danger btn-sm" onclick="delRecitation('${r.id}')">${ICON.trash}</button>
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>` : UI.empty(ICON.recitation, '暂无背书记录，点击"按页"或"按生"开始登记')}
    `;
  } else if (view === 'dashboard') {
    const passCount = records.filter(r => r.status === 'pass').length;
    const passRate = records.length ? Math.round(passCount / records.length * 100) : 0;
    const byStudent = students.map(s => {
      const r = records.filter(x => x.studentId === s.id);
      return { ...s, total: r.length, pass: r.filter(x => x.status === 'pass').length, partial: r.filter(x => x.status === 'partial').length, fail: r.filter(x => x.status === 'fail').length };
    }).sort((a,b) => b.pass - a.pass);
    const byPage = [];
    RECITATION_BOOK.forEach(b => b.pages.forEach(p => {
      const r = records.filter(x => x.unit === b.unit && x.page === p);
      byPage.push({ unit: b.unit, page: p, pass: r.filter(x => x.status === 'pass').length, total: students.length });
    }));

    tabContent = `
      <div class="grid grid-3 mb-3">
        <div class="stat-card green"><div class="stat-icon green">${ICON.success}</div><div><div class="stat-value">${passCount}</div><div class="stat-label">已背总数</div></div></div>
        <div class="stat-card blue"><div class="stat-icon blue">${ICON.list}</div><div><div class="stat-value">${records.length}</div><div class="stat-label">已登记数</div></div></div>
        <div class="stat-card amber"><div class="stat-icon amber">${ICON.percent}</div><div><div class="stat-value">${passRate}%</div><div class="stat-label">通过率</div></div></div>
      </div>
      <div class="grid grid-2">
        <div class="card">
          <div class="card-title">${ICON.user} 学生背书排行榜 (Top 10)</div>
          ${byStudent.slice(0, 10).map((s, i) => {
            const rate = s.total ? Math.round(s.pass / s.total * 100) : 0;
            return `<div class="list-item">
              <div class="badge badge-${i<3?'green':'gray'}" style="min-width:28px;text-align:center">${i+1}</div>
              <div style="flex:1"><div style="font-weight:600;font-size:13px">${s.no}. ${esc(s.name)}</div>
              <div class="progress-bar mt-1"><div class="progress-bar-fill" style="width:${rate}%"></div></div></div>
              <div class="text-sm">${s.pass}/${s.total||'0'}</div>
            </div>`;
          }).join('')}
        </div>
        <div class="card">
          <div class="card-title">${ICON.book} 各页码通过率</div>
          <div class="chart-container" style="height:340px"><canvas id="chart-rec-pages"></canvas></div>
        </div>
      </div>
    `;
    setTimeout(() => {
      const el = document.getElementById('chart-rec-pages');
      if (el && byPage.length) {
        App.regChart(new Chart(el, {
          type: 'bar',
          data: {
            labels: byPage.map(p => p.unit + '-' + p.page),
            datasets: [{ label: '已背人数', data: byPage.map(p => p.pass), backgroundColor: CC.green }]
          },
          options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', scales: { x: { beginAtZero: true, max: students.length } }, plugins: { legend: { display: false } } }
        }));
      }
    }, 50);
  }

  document.getElementById('content').innerHTML = `
    <div class="module-header">
      <div><div class="module-title">${ICON.recitation} 背书统计</div>
      <div class="module-subtitle">${cls.name} · 按书本页数登记</div></div>
    </div>
    ${tabBar([
      {group:'recitation',id:'dashboard',label:'数据看板'},
      {group:'recitation',id:'bypage',label:'按页查看'},
      {group:'recitation',id:'bystudent',label:'按生查看'},
      {group:'recitation',id:'records',label:'全部记录'}
    ], view)}
    ${tabContent}
  `;
};

function cycleRecStatus(unit, page, studentId) {
  const rec = findRecRecord(unit, page, studentId);
  const current = rec ? rec.status : 'none';
  const order = ['none', 'pass', 'partial', 'fail'];
  const next = order[(order.indexOf(current) + 1) % order.length];
  setRecStatus(unit, page, studentId, next);
  M.recitation();
}

function editRecRemark(id) {
  const r = Store.cd('recitation').find(x => x.id === id);
  if (!r) return;
  UI.modal('编辑评语', `
    <div class="form-group"><label class="form-label">${r.unit} ${r.page} - ${r.studentName}</label>
    <textarea class="form-textarea" id="rec-remark-edit" placeholder="如：流利、需练习...">${esc(r.remark||'')}</textarea></div>
  `, `<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button>
     <button class="btn btn-primary" onclick="saveRecRemark('${id}')">保存</button>`);
}

function saveRecRemark(id) {
  const r = Store.cd('recitation').find(x => x.id === id);
  if (!r) return;
  r.remark = document.getElementById('rec-remark-edit').value;
  Store.save();
  UI.closeModal();
  M.recitation();
  UI.toast('已保存');
}

function delRecitation(id) {
  UI.confirm('确定删除此记录？', () => {
    const arr = Store.cd('recitation');
    const idx = arr.findIndex(r => r.id === id);
    if (idx >= 0) { arr.splice(idx, 1); Store.save(); M.recitation(); UI.toast('已删除'); }
  });
}

function exportRecitationWord() {
  const records = Store.cd('recitation');
  const cls = Store.getCurrentClass();
  let html = `<h1>${cls.name} 背书统计表（按页登记）</h1><table><tr><th>序号</th><th>学生</th><th>单元</th><th>页码</th><th>状态</th><th>日期</th><th>评分</th><th>评语</th></tr>`;
  records.forEach((r, i) => {
    const st = RECITATION_STATUS.find(x => x.id === r.status) || RECITATION_STATUS[3];
    html += `<tr><td>${i+1}</td><td>${r.studentName}</td><td>${r.unit}</td><td>${r.page}</td><td>${st.label}</td><td>${r.date}</td><td>${'★'.repeat(r.score||0)}${'☆'.repeat(5-(r.score||0))}</td><td>${r.remark||''}</td></tr>`;
  });
  html += `</table>`;
  UI.exportWord(cls.name + '背书统计', html);
}

/* ============================================================
 * 4. 学生管理
 * ============================================================ */
M.students = function() {
  const cls = Store.getCurrentClass();
  const students = getStudents();

  document.getElementById('content').innerHTML = `
    <div class="module-header">
      <div><div class="module-title">${ICON.students} 学生管理</div>
      <div class="module-subtitle">${cls.name} · 共${students.length}人</div></div>
      <div class="flex gap-2">
        <button class="btn btn-outline" onclick="exportStudentsWord()">${ICON.download} Word报告</button>
        <button class="btn btn-outline" onclick="exportStudents()">${ICON.upload} 导出</button>
        <button class="btn btn-primary" onclick="addStudent()">${ICON.plus} 添加学生</button>
      </div>
    </div>
    <div class="card">
      <div class="flex items-center gap-2 mb-3">
        <div style="position:relative;flex:1;max-width:300px">
          <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-tertiary)">${ICON.search}</span>
          <input class="form-input" id="student-search" placeholder="搜索学生姓名..." style="padding-left:36px" oninput="filterStudents()">
        </div>
      </div>
      <div class="table-wrap"><table class="data-table" id="student-table">
        <thead><tr><th>学号</th><th>姓名</th><th>性别</th><th>英语水平</th><th>家长</th><th>家长电话</th><th>操作</th></tr></thead>
        <tbody>${students.map(s => `<tr data-name="${esc(s.name)}">
          <td>${s.no}</td>
          <td>${UI.avatar(s.name, s.avatar_color)} <span style="vertical-align:middle">${esc(s.name)}</span></td>
          <td>${s.gender}</td>
          <td>${UI.badge(s.englishLevel, s.englishLevel==='优秀'?'green':s.englishLevel==='良好'?'blue':s.englishLevel==='中等'?'amber':'red')}</td>
          <td>${esc(s.parent)}</td>
          <td>${esc(s.parentPhone)}</td>
          <td>
            <button class="btn btn-ghost btn-sm" onclick="viewStudent('${s.id}')">详情</button>
            <button class="btn btn-ghost btn-sm" onclick="editStudent('${s.id}')">编辑</button>
            <button class="btn btn-danger btn-sm" onclick="delStudent('${s.id}')">删除</button>
          </td>
        </tr>`).join('')}</tbody>
      </table></div>
    </div>
  `;
};

function filterStudents() {
  const q = document.getElementById('student-search').value.toLowerCase();
  document.querySelectorAll('#student-table tbody tr').forEach(tr => {
    tr.style.display = tr.dataset.name.toLowerCase().includes(q) ? '' : 'none';
  });
}

function viewStudent(id) {
  const s = getStudents().find(x => x.id === id);
  if (!s) return;
  const grades = Store.cd('grades').filter(g => g.studentId === id);
  const recs = Store.cd('recitation').filter(r => r.studentId === id);
  const convs = Store.cd('conversations').filter(c => c.studentId === id);
  const viols = Store.cd('violations').filter(v => v.studentId === id);
  const avgScore = grades.length ? Math.round(grades.reduce((a,g)=>a+g.score,0)/grades.length) : 0;

  UI.modal(`${s.name} - 个人档案`, `
    <div class="flex items-center gap-3 mb-4">
      ${UI.avatar(s.name, s.avatar_color)}
      <div><div style="font-size:18px;font-weight:700">${esc(s.name)}</div>
      <div class="text-sm text-muted">学号: ${s.no} · ${s.gender} · ${s.englishLevel}</div></div>
    </div>
    <div class="grid grid-2 mb-3">
      <div class="stat-card green"><div class="stat-icon green">${ICON.grades}</div>
        <div><div class="stat-value">${avgScore}</div><div class="stat-label">平均成绩</div></div></div>
      <div class="stat-card blue"><div class="stat-icon blue">${ICON.recitation}</div>
        <div><div class="stat-value">${recs.filter(r=>r.status==='已背').length}/${recs.length}</div><div class="stat-label">背诵完成</div></div></div>
    </div>
    <div class="divider"></div>
    <div class="mb-2 font-bold">基本信息</div>
    <table class="data-table mb-3">
      <tr><td>家长</td><td>${esc(s.parent)}</td></tr>
      <tr><td>家长电话</td><td>${esc(s.parentPhone)}</td></tr>
      <tr><td>学生电话</td><td>${esc(s.phone)}</td></tr>
    </table>
    <div class="mb-2 font-bold">成绩记录 (${grades.length})</div>
    ${grades.length ? `<table class="data-table mb-3"><thead><tr><th>考试</th><th>分数</th></tr></thead>
      <tbody>${grades.map(g=>`<tr><td>${Store.cd('exams').find(e=>e.id===g.examId)?.name||'-'}</td><td>${g.score}</td></tr>`).join('')}</tbody></table>` : '<p class="text-muted text-sm">暂无成绩</p>'}
    <div class="mb-2 font-bold">谈话记录 (${convs.length})</div>
    ${convs.length ? convs.map(c=>`<div class="note-card mb-2"><div class="note-title">${c.date} · ${c.type}</div><div class="note-content">${esc(c.content)}</div></div>`).join('') : '<p class="text-muted text-sm">暂无谈话记录</p>'}
    <div class="mb-2 font-bold">违纪记录 (${viols.length})</div>
    ${viols.length ? viols.map(v=>`<div class="note-card mb-2" style="border-left-color:var(--danger)"><div class="note-title">${v.date} · ${v.type}</div><div class="note-content">${esc(v.desc)}</div></div>`).join('') : '<p class="text-muted text-sm">暂无违纪记录</p>'}
  `);
}

function addStudent() {
  const students = getStudents();
  UI.modal('添加学生', `
    <div class="form-row">
      <div class="form-group"><label class="form-label">姓名</label><input class="form-input" id="st-name" placeholder="学生姓名"></div>
      <div class="form-group"><label class="form-label">性别</label><select class="form-select" id="st-gender"><option value="男">男</option><option value="女">女</option></select></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">英语水平</label><select class="form-select" id="st-level"><option>优秀</option><option>良好</option><option>中等</option><option>需努力</option></select></div>
      <div class="form-group"><label class="form-label">家长</label><input class="form-input" id="st-parent" placeholder="家长姓名"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">家长电话</label><input class="form-input" id="st-pphone" placeholder="家长电话"></div>
      <div class="form-group"><label class="form-label">学生电话</label><input class="form-input" id="st-phone" placeholder="学生电话"></div>
    </div>
  `, `<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button>
     <button class="btn btn-primary" onclick="saveStudent()">保存</button>`);
}

function saveStudent() {
  const students = getStudents();
  const colors = ['#10b981','#3b82f6','#f59e0b','#8b5cf6','#ec4899','#06b6d4'];
  students.push({
    id: Store.uid(),
    no: students.length + 1,
    name: document.getElementById('st-name').value.trim(),
    gender: document.getElementById('st-gender').value,
    avatar_color: colors[students.length % colors.length],
    phone: document.getElementById('st-phone').value,
    parent: document.getElementById('st-parent').value,
    parentPhone: document.getElementById('st-pphone').value,
    englishLevel: document.getElementById('st-level').value,
    notes: ''
  });
  Store.getCurrentClass().studentCount = students.length;
  Store.save(); UI.closeModal(); M.students(); UI.toast('学生已添加');
}

function editStudent(id) {
  const s = getStudents().find(x => x.id === id);
  if (!s) return;
  UI.modal('编辑学生', `
    <div class="form-row">
      <div class="form-group"><label class="form-label">姓名</label><input class="form-input" id="st-name" value="${esc(s.name)}"></div>
      <div class="form-group"><label class="form-label">性别</label><select class="form-select" id="st-gender"><option value="男" ${s.gender==='男'?'selected':''}>男</option><option value="女" ${s.gender==='女'?'selected':''}>女</option></select></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">英语水平</label><select class="form-select" id="st-level">${['优秀','良好','中等','需努力'].map(l=>`<option ${s.englishLevel===l?'selected':''}>${l}</option>`).join('')}</select></div>
      <div class="form-group"><label class="form-label">家长</label><input class="form-input" id="st-parent" value="${esc(s.parent)}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">家长电话</label><input class="form-input" id="st-pphone" value="${esc(s.parentPhone)}"></div>
      <div class="form-group"><label class="form-label">学生电话</label><input class="form-input" id="st-phone" value="${esc(s.phone)}"></div>
    </div>
  `, `<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button>
     <button class="btn btn-primary" onclick="doEditStudent('${id}')">保存</button>`);
}

function doEditStudent(id) {
  const s = getStudents().find(x => x.id === id);
  if (!s) return;
  s.name = document.getElementById('st-name').value.trim();
  s.gender = document.getElementById('st-gender').value;
  s.englishLevel = document.getElementById('st-level').value;
  s.parent = document.getElementById('st-parent').value;
  s.parentPhone = document.getElementById('st-pphone').value;
  s.phone = document.getElementById('st-phone').value;
  Store.save(); UI.closeModal(); M.students(); UI.toast('已更新');
}

function delStudent(id) {
  UI.confirm('确定删除此学生？相关数据将一并删除。', () => {
    const students = getStudents();
    const idx = students.findIndex(s => s.id === id);
    if (idx >= 0) { students.splice(idx, 1); Store.getCurrentClass().studentCount = students.length; Store.save(); M.students(); UI.toast('已删除'); }
  });
}

function exportStudents() {
  const data = JSON.stringify(getStudents(), null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = Store.getCurrentClass().name + '_学生名单.json';
  a.click();
  UI.toast('已导出JSON');
}

function exportStudentsWord() {
  const students = getStudents();
  const cls = Store.getCurrentClass();
  let html = `<h1>${cls.name} 学生花名册</h1><table><tr><th>学号</th><th>姓名</th><th>性别</th><th>英语水平</th><th>家长</th><th>家长电话</th></tr>`;
  students.forEach(s => {
    html += `<tr><td>${s.no}</td><td>${s.name}</td><td>${s.gender}</td><td>${s.englishLevel}</td><td>${s.parent}</td><td>${s.parentPhone}</td></tr>`;
  });
  html += `</table><p style="margin-top:20px">总计：${students.length}人</p>`;
  UI.exportWord(cls.name + '学生花名册', html);
}

/* ============================================================
 * 5. 成绩分析
 * ============================================================ */
M.grades = function() {
  const tab = M._tabs.grades || 'exams';
  const cls = Store.getCurrentClass();
  const exams = Store.cd('exams');
  const grades = Store.cd('grades');
  const students = getStudents();

  let tabContent = '';

  if (tab === 'exams') {
    tabContent = `
      <div class="mb-3"><button class="btn btn-primary" onclick="addExam()">${ICON.plus} 添加考试</button></div>
      ${exams.length ? `<div class="table-wrap"><table class="data-table">
        <thead><tr><th>考试名称</th><th>类型</th><th>日期</th><th>满分</th><th>已录入</th><th>操作</th></tr></thead>
        <tbody>${exams.map(e => {
          const cnt = grades.filter(g => g.examId === e.id).length;
          return `<tr>
            <td>${esc(e.name)}</td><td>${UI.badge(e.type, 'blue')}</td><td>${e.date}</td><td>${e.totalScore}</td>
            <td>${cnt}/${students.length}</td>
            <td>
              <button class="btn btn-ghost btn-sm" onclick="M._tabs.grades='entry';M._editExam='${e.id}';M.grades()">录入成绩</button>
              <button class="btn btn-danger btn-sm" onclick="delExam('${e.id}')">删除</button>
            </td></tr>`;
        }).join('')}</tbody>
      </table></div>` : UI.empty(ICON.grades, '暂无考试')}`;
  } else if (tab === 'entry') {
    const examId = M._editExam || (exams[0] && exams[0].id);
    const exam = exams.find(e => e.id === examId);
    if (!exam) { tabContent = UI.empty(ICON.grades, '请先添加考试'); }
    else {
      tabContent = `
        <div class="flex items-center gap-2 mb-3">
          <select class="form-select" style="max-width:240px" onchange="M._editExam=this.value;M.grades()">
            ${exams.map(e => `<option value="${e.id}" ${e.id===examId?'selected':''}>${esc(e.name)}</option>`).join('')}
          </select>
          <span class="text-muted text-sm">满分: ${exam.totalScore}</span>
        </div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>学号</th><th>姓名</th><th>分数</th></tr></thead>
          <tbody>${students.map(s => {
            const g = grades.find(x => x.studentId === s.id && x.examId === examId);
            return `<tr>
              <td>${s.no}</td><td>${esc(s.name)}</td>
              <td><input type="number" class="form-input" style="width:80px" value="${g?g.score:''}" max="${exam.totalScore}" onchange="updateGrade('${examId}','${s.id}','${s.name}',this.value)"></td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>`;
    }
  } else if (tab === 'analysis') {
    if (!grades.length) { tabContent = UI.empty(ICON.grades, '暂无成绩数据'); }
    else {
      const allScores = grades.map(g => g.score);
      const avg = Math.round(allScores.reduce((a,b)=>a+b,0) / allScores.length);
      const max = Math.max(...allScores);
      const min = Math.min(...allScores);
      const passCount = allScores.filter(s => s >= 60).length;
      const passRate = Math.round(passCount / allScores.length * 100);

      tabContent = `
        <div class="grid grid-4 mb-4">
          <div class="stat-card green"><div class="stat-icon green">${ICON.grades}</div><div><div class="stat-value">${avg}</div><div class="stat-label">平均分</div></div></div>
          <div class="stat-card blue"><div class="stat-icon blue">${ICON.success}</div><div><div class="stat-value">${passRate}%</div><div class="stat-label">及格率</div></div></div>
          <div class="stat-card amber"><div class="stat-icon amber">${ICON.upload}</div><div><div class="stat-value">${max}</div><div class="stat-label">最高分</div></div></div>
          <div class="stat-card red"><div class="stat-icon red">${ICON.download}</div><div><div class="stat-value">${min}</div><div class="stat-label">最低分</div></div></div>
        </div>
        <div class="grid grid-2">
          <div class="card"><div class="card-title">${ICON.grades} 分数段分布</div>
            <div class="chart-container" style="height:260px"><canvas id="chart-grade-dist"></canvas></div></div>
          <div class="card"><div class="card-title">${ICON.schedule} 各次考试趋势</div>
            <div class="chart-container" style="height:260px"><canvas id="chart-grade-trend"></canvas></div></div>
        </div>
        <div class="card mt-4"><div class="card-title">${ICON.students} 学生成绩对比</div>
          <div class="chart-container" style="height:300px"><canvas id="chart-grade-student"></canvas></div></div>
      `;
    }
  }

  document.getElementById('content').innerHTML = `
    <div class="module-header">
      <div><div class="module-title">${ICON.grades} 成绩分析</div>
      <div class="module-subtitle">${cls.name}</div></div>
    </div>
    ${tabBar([
      {group:'grades',id:'exams',label:'考试管理'},
      {group:'grades',id:'entry',label:'成绩录入'},
      {group:'grades',id:'analysis',label:'成绩分析'}
    ], tab)}
    ${tabContent}
  `;

  if (tab === 'analysis' && grades.length) {
    const ranges = [['0-59',0,60],['60-69',60,70],['70-79',70,80],['80-89',80,90],['90-100',90,101]];
    App.regChart(new Chart(document.getElementById('chart-grade-dist'), {
      type: 'bar',
      data: { labels: ranges.map(r=>r[0]), datasets: [{ label: '人数', data: ranges.map(r => grades.filter(g => g.score>=r[1] && g.score<r[2]).length), backgroundColor: [CC.red, CC.amber, CC.blue, CC.greenL, CC.green] }] },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false } } }
    }));

    App.regChart(new Chart(document.getElementById('chart-grade-trend'), {
      type: 'line',
      data: { labels: exams.map(e => e.name), datasets: [{ label: '平均分', data: exams.map(e => { const eg = grades.filter(g=>g.examId===e.id); return eg.length ? Math.round(eg.reduce((a,g)=>a+g.score,0)/eg.length) : 0; }), borderColor: CC.green, backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.3 }] },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100 } }, plugins: { legend: { position: 'bottom' } } }
    }));

    const students = getStudents();
    const firstExam = exams[0];
    App.regChart(new Chart(document.getElementById('chart-grade-student'), {
      type: 'bar',
      data: { labels: students.map(s => s.name), datasets: exams.map((e, i) => ({ label: e.name, data: students.map(s => { const g = grades.find(x=>x.studentId===s.id && x.examId===e.id); return g ? g.score : 0; }), backgroundColor: PALETTE[i % PALETTE.length] })) },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100 } }, plugins: { legend: { position: 'bottom' } } }
    }));
  }
};

function addExam() {
  UI.modal('添加考试', `
    <div class="form-group"><label class="form-label">考试名称</label><input class="form-input" id="ex-name" placeholder="如：第四单元测试"></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">类型</label><select class="form-select" id="ex-type"><option>单元测试</option><option>期中</option><option>期末</option><option>月考</option></select></div>
      <div class="form-group"><label class="form-label">日期</label><input class="form-input" id="ex-date" type="date" value="${todayStr()}"></div>
    </div>
    <div class="form-group"><label class="form-label">满分</label><input class="form-input" id="ex-total" type="number" value="100"></div>
  `, `<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button>
     <button class="btn btn-primary" onclick="saveExam()">保存</button>`);
}

function saveExam() {
  Store.cd('exams').push({
    id: Store.uid(),
    name: document.getElementById('ex-name').value,
    type: document.getElementById('ex-type').value,
    date: document.getElementById('ex-date').value,
    totalScore: parseInt(document.getElementById('ex-total').value)
  });
  Store.save(); UI.closeModal(); M.grades(); UI.toast('考试已添加');
}

function delExam(id) {
  UI.confirm('确定删除此考试？相关成绩也将删除。', () => {
    const exams = Store.cd('exams');
    const idx = exams.findIndex(e => e.id === id);
    if (idx >= 0) {
      exams.splice(idx, 1);
      const grades = Store.cd('grades');
      for (let i = grades.length - 1; i >= 0; i--) { if (grades[i].examId === id) grades.splice(i, 1); }
      Store.save(); M.grades(); UI.toast('已删除');
    }
  });
}

function updateGrade(examId, studentId, studentName, score) {
  const grades = Store.cd('grades');
  let g = grades.find(x => x.examId === examId && x.studentId === studentId);
  if (g) { g.score = parseInt(score) || 0; }
  else { grades.push({ examId, studentId, studentName, score: parseInt(score) || 0 }); }
  Store.save();
}

/* ============================================================
 * 6. 作业管理
 * ============================================================ */
M.homework = function() {
  const cls = Store.getCurrentClass();
  const homework = Store.cd('homework');
  const allStudents = getStudents();

  // helper: derive submitted count from submittedIds if available
  function subCount(h) {
    if (h.submittedIds && h.submittedIds.length) return h.submittedIds.length;
    return h.submitted || 0;
  }

  document.getElementById('content').innerHTML = `
    <div class="module-header">
      <div><div class="module-title">${ICON.homework} 作业管理</div>
      <div class="module-subtitle">${cls.name}</div></div>
      <button class="btn btn-primary" onclick="addHomework()">${ICON.plus} 布置作业</button>
    </div>
    <div class="grid grid-2 mb-4">
      <div class="card"><div class="card-title">${ICON.homework} 作业提交率</div>
        <div class="chart-container" style="height:260px"><canvas id="chart-hw-rate"></canvas></div></div>
      <div class="card"><div class="card-title">${ICON.list} 作业列表</div>
        ${homework.length ? homework.map(h => {
          const cnt = subCount(h);
          const rate = h.total ? Math.round(cnt / h.total * 100) : 0;
          const unsubIds = h.submittedIds || [];
          const unsubStudents = allStudents.filter(s => !unsubIds.includes(s.id));
          const unsubNames = unsubStudents.slice(0, 3).map(s => s.no + '. ' + s.name).join('、');
          const unsubExtra = unsubStudents.length > 3 ? ' 等' + unsubStudents.length + '人' : '';
          return `<div class="list-item" style="cursor:pointer" onclick="viewHomework('${h.id}')">
            <div class="badge badge-${h.type==='抄写'?'green':h.type==='朗读'?'blue':h.type==='书面'?'amber':h.type==='听力'?'purple':'gray'}">${h.type}</div>
            <div style="flex:1"><div style="font-weight:600;font-size:13px">${esc(h.title)}</div>
            <div class="text-sm text-muted">${h.date} · 截止${h.dueDate}</div>
            <div class="progress-bar mt-2"><div class="progress-bar-fill" style="width:${rate}%"></div></div>
            <div class="text-sm mt-1"><span style="color:var(--primary-dark)">${cnt}/${h.total} (${rate}%)</span>
            ${unsubStudents.length > 0 ? `<span class="text-muted ml-2" style="color:var(--danger)">· 未交: ${unsubNames}${unsubExtra}</span>` : ''}</div></div>
            ${UI.badge(h.status, h.status==='已完成'?'green':'amber')}
          </div>`;
        }).join('') : UI.empty(ICON.homework, '暂无作业')}
      </div>
    </div>
  `;

  if (homework.length) {
    App.regChart(new Chart(document.getElementById('chart-hw-rate'), {
      type: 'bar',
      data: { labels: homework.map(h => h.title.slice(0, 12)), datasets: [
        { label: '已交', data: homework.map(h => subCount(h)), backgroundColor: CC.green },
        { label: '未交', data: homework.map(h => h.total - subCount(h)), backgroundColor: CC.amber }
      ]},
      options: { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } }, plugins: { legend: { position: 'bottom' } } }
    }));
  }
};

function addHomework() {
  const students = getStudents();
  UI.modal('布置作业', `
    <div class="form-group"><label class="form-label">作业标题</label><input class="form-input" id="hw-title" placeholder="如：Unit 3 单词抄写"></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">类型</label><select class="form-select" id="hw-type">${['抄写','朗读','书面','听力','口语','阅读'].map(t=>`<option>${t}</option>`).join('')}</select></div>
      <div class="form-group"><label class="form-label">截止日期</label><input class="form-input" id="hw-due" type="date" value="${todayStr()}"></div>
    </div>
    <div class="form-group"><label class="form-label">应交人数</label><input class="form-input" id="hw-total" type="number" value="${students.length}"></div>
  `, `<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button>
     <button class="btn btn-primary" onclick="saveHomework()">布置</button>`);
}

function saveHomework() {
  Store.cd('homework').unshift({
    id: Store.uid(),
    title: document.getElementById('hw-title').value,
    type: document.getElementById('hw-type').value,
    date: todayStr(),
    dueDate: document.getElementById('hw-due').value,
    submitted: 0,
    total: parseInt(document.getElementById('hw-total').value) || 0,
    status: '进行中',
    submittedIds: []
  });
  Store.save(); UI.closeModal(); M.homework(); UI.toast('作业已布置');
}

function viewHomework(id) {
  const h = Store.cd('homework').find(x => x.id === id);
  if (!h) return;
  const allStudents = getStudents();
  const submittedIds = h.submittedIds || [];
  const cnt = submittedIds.length;
  const rate = h.total ? Math.round(cnt / h.total * 100) : 0;

  // Generate student checkbox list
  let studentList = '';
  allStudents.forEach(s => {
    const checked = submittedIds.includes(s.id);
    studentList += `<label class="checkbox-item" style="cursor:pointer">
      <div class="custom-checkbox ${checked ? 'checked' : ''}" data-sid="${s.id}">${checked ? ICON.check : ''}</div>
      <span class="todo-text">${s.no}. ${esc(s.name)}</span>
    </label>`;
  });

  UI.modal(`${h.title}`, `
    <div class="grid grid-2 mb-3">
      <div class="stat-card green"><div class="stat-icon green">${ICON.success}</div><div><div class="stat-value" id="hw-cnt">${cnt}</div><div class="stat-label">已交</div></div></div>
      <div class="stat-card amber"><div class="stat-icon amber">${ICON.alert}</div><div><div class="stat-value" id="hw-uncnt">${h.total - cnt}</div><div class="stat-label">未交</div></div></div>
    </div>
    <div class="mb-2"><div class="text-sm text-muted mb-1">提交率</div><div class="progress-bar"><div class="progress-bar-fill" id="hw-bar" style="width:${rate}%"></div></div><div class="text-sm mt-1" id="hw-rate-text">${rate}%</div></div>
    <div class="divider"></div>
    <div class="form-group"><label class="form-label">状态</label><select class="form-select" id="hw-status"><option value="进行中" ${h.status==='进行中'?'selected':''}>进行中</option><option value="已完成" ${h.status==='已完成'?'selected':''}>已完成</option></select></div>
    <div class="divider"></div>
    <div class="mb-2 font-bold text-sm">提交情况（点击切换）</div>
    <div class="table-wrap" style="max-height:300px;overflow-y:auto" id="hw-student-list">
      ${studentList}
    </div>
  `, `<button class="btn btn-danger" onclick="delHomework('${h.id}')">删除</button>
     <button class="btn btn-primary" onclick="saveHomeworkEdit('${h.id}')">保存</button>`);

  // Bind click events to checkboxes
  setTimeout(() => {
    const checkboxes = document.querySelectorAll('#hw-student-list .custom-checkbox');
    checkboxes.forEach(cb => {
      cb.onclick = function() {
        this.classList.toggle('checked');
        if (this.classList.contains('checked')) {
          this.innerHTML = ICON.check;
        } else {
          this.innerHTML = '';
        }
        // Update stats
        const checkedCount = document.querySelectorAll('#hw-student-list .custom-checkbox.checked').length;
        document.getElementById('hw-cnt').textContent = checkedCount;
        document.getElementById('hw-uncnt').textContent = h.total - checkedCount;
        const newRate = h.total ? Math.round(checkedCount / h.total * 100) : 0;
        document.getElementById('hw-bar').style.width = newRate + '%';
        document.getElementById('hw-rate-text').textContent = newRate + '%';
      };
    });
  }, 100);
}

function saveHomeworkEdit(id) {
  const h = Store.cd('homework').find(x => x.id === id);
  if (!h) return;
  h.status = document.getElementById('hw-status').value;
  // Collect checked student IDs from checkboxes
  const checkboxes = document.querySelectorAll('#hw-student-list .custom-checkbox');
  h.submittedIds = [];
  checkboxes.forEach(cb => {
    if (cb.classList.contains('checked')) {
      h.submittedIds.push(cb.dataset.sid);
    }
  });
  h.submitted = h.submittedIds.length;
  Store.save(); UI.closeModal(); M.homework(); UI.toast('已更新');
}

function delHomework(id) {
  UI.confirm('确定删除此作业？', () => {
    const arr = Store.cd('homework');
    const idx = arr.findIndex(h => h.id === id);
    if (idx >= 0) { arr.splice(idx, 1); Store.save(); UI.closeModal(); M.homework(); UI.toast('已删除'); }
  });
}

/* ============================================================
 * 7. 教师备课
 * ============================================================ */
M.lesson = function() {
  const tab = M._tabs.lesson || 'resources';
  const cls = Store.getCurrentClass();

  let tabContent = '';

  if (tab === 'resources') {
    const resources = [
      {name:'人教PEP英语网',url:'https://www.pep.com.cn/yy/',desc:'人教版官方教材资源',icon:'book',color:'#10b981'},
      {name:'国家智慧教育平台',url:'https://www.zxx.edu.cn/',desc:'国家级优质教育资源',icon:'globe',color:'#3b82f6'},
      {name:'21世纪英语教育',url:'https://www.i21st.cn/',desc:'英语教学资讯',icon:'newsIcon',color:'#f59e0b'},
      {name:'可可英语',url:'https://www.kekenet.com/',desc:'听力与口语练习',icon:'audio',color:'#8b5cf6'},
      {name:'百词斩',url:'https://www.baicizhan.com/',desc:'单词记忆工具',icon:'word',color:'#ec4899'},
      {name:'沪江英语',url:'https://www.hjenglish.com/',desc:'课本同步点读',icon:'mic',color:'#06b6d4'},
      {name:'英语点读',url:'https://www.51tingla.com/',desc:'小学英语点读',icon:'mic',color:'#10b981'},
      {name:'ABC英语',url:'https://www.abc.com/',desc:'少儿英语资源',icon:'book',color:'#f59e0b'}
    ];
    tabContent = `<div class="grid grid-auto">${resources.map(r => `
      <a class="resource-card" href="${r.url}" target="_blank">
        <div class="res-icon" style="background:${r.color}15;color:${r.color}">${ICON[r.icon]||ICON.book}</div>
        <div class="res-name">${r.name}</div>
        <div class="res-desc">${r.desc}</div>
      </a>`).join('')}</div>`;
  } else if (tab === 'plans') {
    const plans = Store.gd('lessonPlans');
    tabContent = `
      <div class="mb-3"><button class="btn btn-primary" onclick="addLessonPlan()">${ICON.plus} 新建教案</button></div>
      ${plans.length ? `<div class="grid grid-2">${plans.map(p => `
        <div class="card">
          <div class="flex items-center justify-between mb-2">
            <div style="font-weight:700;font-size:14px">${esc(p.title)}</div>
            ${UI.badge(p.status, p.status==='已完成'?'green':'amber')}
          </div>
          <div class="text-sm text-muted mb-2">${p.unit} · ${p.date}</div>
          <div class="text-sm" style="line-height:1.5;color:var(--text-secondary)">${esc(p.content)}</div>
          <div class="mt-3 flex gap-2">
            <button class="btn btn-outline btn-sm" onclick="editLessonPlan('${p.id}')">${ICON.edit} 编辑</button>
            <button class="btn btn-danger btn-sm" onclick="delLessonPlan('${p.id}')">删除</button>
          </div>
        </div>`).join('')}</div>` : UI.empty(ICON.lesson, '暂无教案')}
    `;
  } else if (tab === 'courseware') {
    tabContent = `
      <div class="mb-3"><button class="btn btn-primary" onclick="addCourseware()">${ICON.plus} 添加课件</button></div>
      <div class="card">
        <div class="list-item">
          <div class="stat-icon green">${ICON.file}</div>
          <div style="flex:1"><div style="font-weight:600">Unit 1 My Classroom.pptx</div><div class="text-sm text-muted">12页 · 2025-09-02</div></div>
          <button class="btn btn-outline btn-sm">${ICON.download} 下载</button>
        </div>
        <div class="list-item">
          <div class="stat-icon blue">${ICON.file}</div>
          <div style="flex:1"><div style="font-weight:600">Unit 2 My Schoolbag.pptx</div><div class="text-sm text-muted">15页 · 2025-09-10</div></div>
          <button class="btn btn-outline btn-sm">${ICON.download} 下载</button>
        </div>
        <div class="list-item">
          <div class="stat-icon amber">${ICON.file}</div>
          <div style="flex:1"><div style="font-weight:600">Unit 3 My Friends.pptx</div><div class="text-sm text-muted">10页 · 2025-09-20</div></div>
          <button class="btn btn-outline btn-sm">${ICON.download} 下载</button>
        </div>
      </div>`;
  } else if (tab === 'library') {
    tabContent = `
      <div class="grid grid-auto">
        ${[{n:'教学图片库',c:'#10b981',d:'课堂用图片素材'},{n:'音频素材库',c:'#3b82f6',d:'课本配套音频'},{n:'视频素材库',c:'#f59e0b',d:'教学视频资源'},{n:'练习题库',c:'#8b5cf6',d:'各单元练习题'},{n:'试卷模板',c:'#ec4899',d:'考试试卷模板'},{n:'教学游戏',c:'#06b6d4',d:'课堂互动游戏'}].map(r => `
        <div class="resource-card" onclick="UI.toast('资源库功能开发中')">
          <div class="res-icon" style="background:${r.c}15;color:${r.c}">${ICON.folder}</div>
          <div class="res-name">${r.n}</div>
          <div class="res-desc">${r.d}</div>
        </div>`).join('')}
      </div>`;
  } else if (tab === 'exercises') {
    tabContent = `
      <div class="card mb-3">
        <div class="card-title">${ICON.list} 学科练习</div>
        <div class="list-item"><div class="badge badge-green">Unit 1</div><div style="flex:1">单词拼写练习 (20题)</div><button class="btn btn-outline btn-sm">开始</button></div>
        <div class="list-item"><div class="badge badge-blue">Unit 2</div><div style="flex:1">选择题练习 (15题)</div><button class="btn btn-outline btn-sm">开始</button></div>
        <div class="list-item"><div class="badge badge-amber">Unit 3</div><div style="flex:1">阅读理解 (3篇)</div><button class="btn btn-outline btn-sm">开始</button></div>
        <div class="list-item"><div class="badge badge-purple">综合</div><div style="flex:1">语法填空 (10题)</div><button class="btn btn-outline btn-sm">开始</button></div>
      </div>`;
  }

  document.getElementById('content').innerHTML = `
    <div class="module-header">
      <div><div class="module-title">${ICON.lesson} 教师备课</div>
      <div class="module-subtitle">${cls.name}</div></div>
    </div>
    ${tabBar([
      {group:'lesson',id:'resources',label:'资源网站'},
      {group:'lesson',id:'plans',label:'我的教案'},
      {group:'lesson',id:'courseware',label:'课件制作'},
      {group:'lesson',id:'library',label:'资源库'},
      {group:'lesson',id:'exercises',label:'学科练习'}
    ], tab)}
    ${tabContent}
  `;
};

function addLessonPlan() {
  UI.modal('新建教案', `
    <div class="form-group"><label class="form-label">标题</label><input class="form-input" id="lp-title" placeholder="如：Unit 4 My Home 教案"></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">单元</label><input class="form-input" id="lp-unit" placeholder="如：Unit 4"></div>
      <div class="form-group"><label class="form-label">状态</label><select class="form-select" id="lp-status"><option>进行中</option><option>已完成</option></select></div>
    </div>
    <div class="form-group"><label class="form-label">教学内容</label><textarea class="form-textarea" id="lp-content" placeholder="教学目标、重点难点、教学过程等"></textarea></div>
  `, `<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button>
     <button class="btn btn-primary" onclick="saveLessonPlan()">保存</button>`);
}

function saveLessonPlan() {
  Store.gd('lessonPlans').unshift({
    id: Store.uid(),
    title: document.getElementById('lp-title').value,
    unit: document.getElementById('lp-unit').value,
    date: todayStr(),
    status: document.getElementById('lp-status').value,
    content: document.getElementById('lp-content').value
  });
  Store.save(); UI.closeModal(); M.lesson(); UI.toast('教案已创建');
}

function editLessonPlan(id) {
  const p = Store.gd('lessonPlans').find(x => x.id === id);
  if (!p) return;
  UI.modal('编辑教案', `
    <div class="form-group"><label class="form-label">标题</label><input class="form-input" id="lp-title" value="${esc(p.title)}"></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">单元</label><input class="form-input" id="lp-unit" value="${esc(p.unit)}"></div>
      <div class="form-group"><label class="form-label">状态</label><select class="form-select" id="lp-status"><option ${p.status==='进行中'?'selected':''}>进行中</option><option ${p.status==='已完成'?'selected':''}>已完成</option></select></div>
    </div>
    <div class="form-group"><label class="form-label">教学内容</label><textarea class="form-textarea" id="lp-content">${esc(p.content)}</textarea></div>
  `, `<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button>
     <button class="btn btn-primary" onclick="doEditLessonPlan('${id}')">保存</button>`);
}

function doEditLessonPlan(id) {
  const p = Store.gd('lessonPlans').find(x => x.id === id);
  if (!p) return;
  p.title = document.getElementById('lp-title').value;
  p.unit = document.getElementById('lp-unit').value;
  p.status = document.getElementById('lp-status').value;
  p.content = document.getElementById('lp-content').value;
  Store.save(); UI.closeModal(); M.lesson(); UI.toast('已更新');
}

function delLessonPlan(id) {
  UI.confirm('确定删除此教案？', () => {
    const arr = Store.gd('lessonPlans');
    const idx = arr.findIndex(p => p.id === id);
    if (idx >= 0) { arr.splice(idx, 1); Store.save(); M.lesson(); UI.toast('已删除'); }
  });
}

function addCourseware() {
  UI.toast('课件上传功能开发中', 'info');
}

/* ============================================================
 * 8. 工作留痕
 * ============================================================ */
M.records = function() {
  const cls = Store.getCurrentClass();
  const records = Store.gd('workRecords');
  const sorted = [...records].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  const types = [...new Set(records.map(r => r.type))];
  const typeCounts = types.map(t => ({ type: t, count: records.filter(r => r.type === t).length }));

  document.getElementById('content').innerHTML = `
    <div class="module-header">
      <div><div class="module-title">${ICON.records} 工作留痕</div>
      <div class="module-subtitle">时间轴视图 · ${cls.name}</div></div>
      <div class="flex gap-2">
        <button class="btn btn-outline" onclick="exportRecordsWord()">${ICON.download} 批量导出</button>
        <button class="btn btn-primary" onclick="addRecord()">${ICON.plus} 添加记录</button>
      </div>
    </div>
    <div class="grid grid-2 mb-4">
      <div class="card"><div class="card-title">${ICON.records} 类型统计</div>
        <div class="chart-container" style="height:240px">
          ${records.length ? '<canvas id="chart-rec-type"></canvas>' : UI.empty(ICON.records, '暂无工作记录，饼图将在添加记录后显示')}
        </div></div>
      <div class="card"><div class="card-title">${ICON.list} 统计概览</div>
        <div class="grid grid-2">
          ${typeCounts.length ? typeCounts.map(t => `<div class="stat-card green"><div class="stat-icon green">${ICON[t.type==='备课'?'lesson':t.type==='教研'?'communication':t.type==='听课'?'dashboard':t.type==='批改'?'homework':'clock']}</div><div><div class="stat-value">${t.count}</div><div class="stat-label">${t.type}</div></div></div>`).join('') : `<div class="stat-card gray"><div class="stat-icon gray">${ICON.clock}</div><div><div class="stat-value">0</div><div class="stat-label">暂无记录</div></div></div>`}
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">${ICON.clock} 工作时间轴</div>
      <div class="timeline">
        ${sorted.map(r => `<div class="timeline-item">
          <div class="timeline-date">${r.date} ${r.time} · ${UI.badge(r.type, r.type==='备课'?'green':r.type==='教研'?'blue':r.type==='听课'?'purple':r.type==='批改'?'amber':'gray')}</div>
          <div class="timeline-title">${esc(r.title)}</div>
          <div class="timeline-desc">${esc(r.desc)}</div>
          <div class="mt-2"><button class="btn btn-danger btn-sm" onclick="delRecord('${r.id}')">删除</button></div>
        </div>`).join('')}
      </div>
    </div>
  `;

  if (records.length && typeof Chart !== 'undefined') {
    try {
      const canvas = document.getElementById('chart-rec-type');
      if (!canvas) return;
      App.regChart(new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels: typeCounts.map(t => t.type),
          datasets: [{
            data: typeCounts.map(t => t.count),
            backgroundColor: PALETTE.slice(0, typeCounts.length),
            borderColor: '#ffffff',
            borderWidth: 2,
            hoverOffset: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '55%',
          plugins: {
            legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16 } },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                  const pct = total ? Math.round(ctx.raw / total * 100) : 0;
                  return `${ctx.label}: ${ctx.raw} (${pct}%)`;
                }
              }
            }
          }
        }
      }));
    } catch (e) {
      console.error('工作留痕饼图渲染失败:', e);
      const container = document.querySelector('.chart-container');
      if (container) container.innerHTML = UI.empty(ICON.alert, '图表加载失败，请刷新页面重试');
    }
  }
};

function addRecord() {
  UI.modal('添加工作记录', `
    <div class="form-row">
      <div class="form-group"><label class="form-label">日期</label><input class="form-input" id="wr-date" type="date" value="${todayStr()}"></div>
      <div class="form-group"><label class="form-label">时间</label><input class="form-input" id="wr-time" type="time" value="09:00"></div>
    </div>
    <div class="form-group"><label class="form-label">类型</label><select class="form-select" id="wr-type">${['备课','教研','听课','批改','辅导','会议','其他'].map(t=>`<option>${t}</option>`).join('')}</select></div>
    <div class="form-group"><label class="form-label">标题</label><input class="form-input" id="wr-title" placeholder="工作标题"></div>
    <div class="form-group"><label class="form-label">描述</label><textarea class="form-textarea" id="wr-desc" placeholder="工作内容描述"></textarea></div>
  `, `<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button>
     <button class="btn btn-primary" onclick="saveRecord()">保存</button>`);
}

function saveRecord() {
  Store.gd('workRecords').push({
    id: Store.uid(),
    date: document.getElementById('wr-date').value,
    time: document.getElementById('wr-time').value,
    type: document.getElementById('wr-type').value,
    title: document.getElementById('wr-title').value,
    desc: document.getElementById('wr-desc').value
  });
  Store.save(); UI.closeModal(); M.records(); UI.toast('记录已添加');
}

function delRecord(id) {
  UI.confirm('确定删除此记录？', () => {
    const arr = Store.gd('workRecords');
    const idx = arr.findIndex(r => r.id === id);
    if (idx >= 0) { arr.splice(idx, 1); Store.save(); M.records(); UI.toast('已删除'); }
  });
}

function exportRecordsWord() {
  const records = Store.gd('workRecords').sort((a,b) => (a.date+a.time).localeCompare(b.date+b.time));
  let html = '<h1>工作留痕记录表</h1><table><tr><th>日期</th><th>时间</th><th>类型</th><th>标题</th><th>描述</th></tr>';
  records.forEach(r => { html += `<tr><td>${r.date}</td><td>${r.time}</td><td>${r.type}</td><td>${r.title}</td><td>${r.desc}</td></tr>`; });
  html += '</table>';
  UI.exportWord('工作留痕记录', html);
}

/* ============================================================
 * 9. 谈话记录 + 座位编排
 * ============================================================ */
M.conversations = function() {
  const tab = M._tabs.conversations || 'list';
  const cls = Store.getCurrentClass();

  let tabContent = '';

  if (tab === 'list') {
    const convs = Store.cd('conversations');
    tabContent = `
      <div class="mb-3 flex gap-2">
        <button class="btn btn-primary" onclick="addConversation()">${ICON.plus} 添加谈话</button>
        <button class="btn btn-outline" onclick="exportConversationsWord()">${ICON.download} 按学生导出</button>
      </div>
      ${convs.length ? convs.map(c => `
        <div class="card mb-2">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              ${UI.avatar(c.studentName, '#10b981')}
              <div><div style="font-weight:700">${esc(c.studentName)}</div>
              <div class="text-sm text-muted">${c.date} · ${UI.badge(c.type, 'blue')}</div></div>
            </div>
            <div class="flex gap-2">
              <button class="btn btn-ghost btn-sm" onclick="delConversation('${c.id}')">删除</button>
            </div>
          </div>
          <div style="font-weight:600;font-size:13px;margin-bottom:4px">主题：${esc(c.topic)}</div>
          <div class="text-sm" style="color:var(--text-secondary);line-height:1.5">${esc(c.content)}</div>
          <div class="text-sm mt-2" style="color:var(--primary-dark)"><strong>结果：</strong>${esc(c.result)}</div>
        </div>`).join('') : UI.empty(ICON.conversations, '暂无谈话记录')}
    `;
  } else if (tab === 'seating') {
    const seats = Store.cd('seating');
    const students = getStudents();
    const rows = seats.length ? Math.max(...seats.map(s => s.row)) + 1 : 5;
    const cols = seats.length ? Math.max(...seats.map(s => s.col)) + 1 : 4;
    let selectedSeat = null;

    let grid = `<div class="blackboard">讲 台 / 黑 板</div><div class="seating-grid" style="grid-template-columns:repeat(${cols}, 64px)">`;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const seat = seats.find(s => s.row === r && s.col === c);
        const name = seat && seat.studentName ? seat.studentName : '';
        grid += `<div class="seat ${name ? '' : 'seat-empty'}" data-row="${r}" data-col="${c}" onclick="selectSeat(${r},${c})">
          ${name ? `<span class="seat-name">${esc(name)}</span><span class="seat-num">R${r+1}C${c+1}</span>` : `<span class="seat-num">空位</span>`}
        </div>`;
      }
    }
    grid += `</div>`;

    tabContent = `
      <div class="mb-3 flex gap-2 flex-wrap">
        <button class="btn btn-primary" onclick="autoArrangeSeats()">${ICON.refresh} 自动排座</button>
        <button class="btn btn-outline" onclick="exportSeatingImage()">${ICON.image} 导出图片</button>
        <button class="btn btn-outline" onclick="addSeatRow()">${ICON.plus} 添加行</button>
        <button class="btn btn-outline" onclick="removeSeatRow()">${ICON.close} 删除行</button>
      </div>
      <div class="card">
        <div class="text-sm text-muted mb-2">点击两个座位可交换学生位置</div>
        ${grid}
        <div id="seat-info" class="mt-3 text-sm text-muted"></div>
      </div>
    `;
  }

  document.getElementById('content').innerHTML = `
    <div class="module-header">
      <div><div class="module-title">${ICON.conversations} 谈话记录</div>
      <div class="module-subtitle">${cls.name}</div></div>
    </div>
    ${tabBar([
      {group:'conversations',id:'list',label:'谈话档案'},
      {group:'conversations',id:'seating',label:'座位编排'}
    ], tab)}
    ${tabContent}
  `;
};

let _selectedSeat = null;

function selectSeat(row, col) {
  const seats = Store.cd('seating');
  const seat = seats.find(s => s.row === row && s.col === col);

  if (_selectedSeat === null) {
    _selectedSeat = { row, col };
    document.querySelectorAll('.seat').forEach(el => el.classList.remove('selected'));
    const el = document.querySelector(`.seat[data-row="${row}"][data-col="${col}"]`);
    if (el) el.classList.add('selected');
    document.getElementById('seat-info').textContent = `已选择: R${row+1}C${col+1} (${seat && seat.studentName ? seat.studentName : '空位'})，点击另一个座位交换`;
  } else {
    const from = _selectedSeat;
    const to = { row, col };
    if (from.row === to.row && from.col === to.col) {
      _selectedSeat = null;
      document.querySelectorAll('.seat').forEach(el => el.classList.remove('selected'));
      document.getElementById('seat-info').textContent = '';
      return;
    }
    const fromSeat = seats.find(s => s.row === from.row && s.col === from.col);
    const toSeat = seats.find(s => s.row === to.row && s.col === to.col);
    if (fromSeat && toSeat) {
      const tmpName = fromSeat.studentName;
      const tmpId = fromSeat.studentId;
      fromSeat.studentName = toSeat.studentName;
      fromSeat.studentId = toSeat.studentId;
      toSeat.studentName = tmpName;
      toSeat.studentId = tmpId;
      Store.save();
    }
    _selectedSeat = null;
    M.conversations();
    UI.toast('座位已交换');
  }
}

function autoArrangeSeats() {
  UI.confirm('确定自动重新排列座位？当前排列将被覆盖。', () => {
    const students = getStudents();
    const seats = Store.cd('seating');
    const shuffled = [...students].sort(() => Math.random() - 0.5);
    seats.forEach((seat, i) => {
      if (i < shuffled.length) {
        seat.studentId = shuffled[i].id;
        seat.studentName = shuffled[i].name;
      } else {
        seat.studentId = null;
        seat.studentName = '';
      }
    });
    Store.save();
    M.conversations();
    UI.toast('座位已重新排列');
  });
}

function addSeatRow() {
  const seats = Store.cd('seating');
  const rows = seats.length ? Math.max(...seats.map(s => s.row)) + 1 : 5;
  const cols = seats.length ? Math.max(...seats.map(s => s.col)) + 1 : 4;
  for (let c = 0; c < cols; c++) {
    seats.push({ row: rows, col: c, studentId: null, studentName: '' });
  }
  Store.save();
  M.conversations();
  UI.toast('已添加一行');
}

function removeSeatRow() {
  const seats = Store.cd('seating');
  if (seats.length === 0) return;
  const maxRow = Math.max(...seats.map(s => s.row));
  UI.confirm(`确定删除第${maxRow+1}行？`, () => {
    for (let i = seats.length - 1; i >= 0; i--) {
      if (seats[i].row === maxRow) seats.splice(i, 1);
    }
    Store.save();
    M.conversations();
    UI.toast('已删除一行');
  });
}

function exportSeatingImage() {
  const seats = Store.cd('seating');
  const cls = Store.getCurrentClass();
  const rows = Math.max(...seats.map(s => s.row)) + 1;
  const cols = Math.max(...seats.map(s => s.col)) + 1;
  const cellW = 84, cellH = 54, pad = 12, blackboardH = 36;
  const w = cols * cellW + pad * 2;
  const h = rows * cellH + pad * 2 + blackboardH + 20;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" style="background:#f0fdf4;font-family:sans-serif">`;
  svg += `<rect x="${pad}" y="${pad}" width="${w-pad*2}" height="${blackboardH}" rx="8" fill="#059669"/>`;
  svg += `<text x="${w/2}" y="${pad+23}" text-anchor="middle" fill="#fff" font-size="14" font-weight="bold">讲 台 / 黑 板</text>`;
  seats.forEach(seat => {
    const x = pad + seat.col * cellW;
    const y = pad + blackboardH + 12 + seat.row * cellH;
    svg += `<rect x="${x}" y="${y}" width="${cellW-6}" height="${cellH-6}" rx="6" fill="${seat.studentName?'#fff':'#f3f4f6'}" stroke="#d1d5db"/>`;
    if (seat.studentName) {
      svg += `<text x="${x+(cellW-6)/2}" y="${y+22}" text-anchor="middle" fill="#1f2937" font-size="12" font-weight="600">${seat.studentName}</text>`;
      svg += `<text x="${x+(cellW-6)/2}" y="${y+38}" text-anchor="middle" fill="#9ca3af" font-size="9">R${seat.row+1}C${seat.col+1}</text>`;
    } else {
      svg += `<text x="${x+(cellW-6)/2}" y="${y+28}" text-anchor="middle" fill="#d1d5db" font-size="10">空位</text>`;
    }
  });
  svg += `<text x="${w/2}" y="${h-4}" text-anchor="middle" fill="#6b7280" font-size="11">${cls.name} 座位表 · 生成于 ${todayStr()}</text>`;
  svg += '</svg>';

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f0fdf4'; ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0);
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = cls.name + '_座位表.png';
    a.click();
    UI.toast('座位表已导出');
  };
  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
}

function addConversation() {
  const students = getStudents();
  UI.modal('添加谈话记录', `
    <div class="form-group"><label class="form-label">学生</label>
      <select class="form-select" id="cv-student">${students.map(s=>`<option value="${s.id}|${s.name}">${s.no}. ${s.name}</option>`).join('')}</select></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">日期</label><input class="form-input" id="cv-date" type="date" value="${todayStr()}"></div>
      <div class="form-group"><label class="form-label">类型</label><select class="form-select" id="cv-type">${['学习','行为','心理','家庭','其他'].map(t=>`<option>${t}</option>`).join('')}</select></div>
    </div>
    <div class="form-group"><label class="form-label">主题</label><input class="form-input" id="cv-topic" placeholder="谈话主题"></div>
    <div class="form-group"><label class="form-label">谈话内容</label><textarea class="form-textarea" id="cv-content" placeholder="详细记录谈话内容"></textarea></div>
    <div class="form-group"><label class="form-label">结果/措施</label><input class="form-input" id="cv-result" placeholder="谈话结果和后续措施"></div>
  `, `<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button>
     <button class="btn btn-primary" onclick="saveConversation()">保存</button>`);
}

function saveConversation() {
  const [sid, sname] = document.getElementById('cv-student').value.split('|');
  Store.cd('conversations').unshift({
    id: Store.uid(), studentId: sid, studentName: sname,
    date: document.getElementById('cv-date').value,
    type: document.getElementById('cv-type').value,
    topic: document.getElementById('cv-topic').value,
    content: document.getElementById('cv-content').value,
    result: document.getElementById('cv-result').value
  });
  Store.save(); UI.closeModal(); M.conversations(); UI.toast('谈话记录已添加');
}

function delConversation(id) {
  UI.confirm('确定删除此记录？', () => {
    const arr = Store.cd('conversations');
    const idx = arr.findIndex(c => c.id === id);
    if (idx >= 0) { arr.splice(idx, 1); Store.save(); M.conversations(); UI.toast('已删除'); }
  });
}

function exportConversationsWord() {
  const convs = Store.cd('conversations');
  const cls = Store.getCurrentClass();
  const byStudent = {};
  convs.forEach(c => {
    if (!byStudent[c.studentName]) byStudent[c.studentName] = [];
    byStudent[c.studentName].push(c);
  });
  let html = `<h1>${cls.name} 谈话记录汇总</h1>`;
  Object.keys(byStudent).forEach(name => {
    html += `<h2 style="font-size:14pt;margin-top:16pt">${name}</h2><table><tr><th>日期</th><th>类型</th><th>主题</th><th>内容</th><th>结果</th></tr>`;
    byStudent[name].forEach(c => {
      html += `<tr><td>${c.date}</td><td>${c.type}</td><td>${c.topic}</td><td>${c.content}</td><td>${c.result}</td></tr>`;
    });
    html += '</table>';
  });
  UI.exportWord(cls.name + '谈话记录', html);
}

/* ============================================================
 * 10. 家校沟通
 * ============================================================ */
M.communication = function() {
  const tab = M._tabs.communication || 'ledger';
  const cls = Store.getCurrentClass();
  const students = getStudents();
  const comms = Store.cd('communications');

  let tabContent = '';

  if (tab === 'ledger') {
    tabContent = `
      <div class="card">
        <div class="card-title">${ICON.users} 家长台账 · ${cls.name}</div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>学号</th><th>学生</th><th>家长</th><th>电话</th><th>沟通次数</th></tr></thead>
          <tbody>${students.map(s => {
            const cnt = comms.filter(c => c.studentId === s.id).length;
            return `<tr><td>${s.no}</td><td>${esc(s.name)}</td><td>${esc(s.parent)}</td><td>${esc(s.parentPhone)}</td>
            <td>${cnt > 0 ? UI.badge(cnt+'次', 'blue') : '<span class="text-muted">-</span>'}</td></tr>`;
          }).join('')}</tbody>
        </table></div>
      </div>`;
  } else if (tab === 'visit') {
    const visits = comms.filter(c => c.type === '家访');
    tabContent = `
      <div class="mb-3"><button class="btn btn-primary" onclick="addComm('家访')">${ICON.plus} 添加家访</button></div>
      ${visits.length ? visits.map(c => `<div class="card mb-2">
        <div class="flex items-center justify-between mb-2">
          <div><span style="font-weight:700">${c.studentName}</span> <span class="text-sm text-muted">${c.date}</span></div>
          <button class="btn btn-danger btn-sm" onclick="delComm('${c.id}')">删除</button>
        </div>
        <div class="text-sm" style="line-height:1.5">${esc(c.content)}</div>
        ${c.result ? `<div class="text-sm mt-2" style="color:var(--primary-dark)"><strong>结果：</strong>${esc(c.result)}</div>` : ''}
      </div>`).join('') : UI.empty(ICON.communication, '暂无家访记录')}
    `;
  } else if (tab === 'meeting') {
    const meetings = comms.filter(c => c.type === '家长会');
    tabContent = `
      <div class="mb-3"><button class="btn btn-primary" onclick="addComm('家长会')">${ICON.plus} 添加家长会</button></div>
      ${meetings.length ? meetings.map(c => `<div class="card mb-2">
        <div class="flex items-center justify-between mb-2">
          <div><span style="font-weight:700">${c.date}</span></div>
          <button class="btn btn-danger btn-sm" onclick="delComm('${c.id}')">删除</button>
        </div>
        <div class="text-sm" style="line-height:1.5">${esc(c.content)}</div>
        ${c.result ? `<div class="text-sm mt-2" style="color:var(--primary-dark)"><strong>结果：</strong>${esc(c.result)}</div>` : ''}
      </div>`).join('') : UI.empty(ICON.communication, '暂无家长会记录')}
    `;
  } else if (tab === 'notice') {
    const notices = comms.filter(c => c.type === '群通知');
    tabContent = `
      <div class="mb-3"><button class="btn btn-primary" onclick="addComm('群通知')">${ICON.plus} 发送通知</button></div>
      ${notices.length ? notices.map(c => `<div class="card mb-2">
        <div class="flex items-center justify-between mb-2">
          <div><span style="font-weight:700">${c.date}</span></div>
          <button class="btn btn-danger btn-sm" onclick="delComm('${c.id}')">删除</button>
        </div>
        <div class="text-sm" style="line-height:1.5">${esc(c.content)}</div>
        ${c.result ? `<div class="text-sm mt-2 text-muted">${esc(c.result)}</div>` : ''}
      </div>`).join('') : UI.empty(ICON.communication, '暂无群通知')}
    `;
  }

  document.getElementById('content').innerHTML = `
    <div class="module-header">
      <div><div class="module-title">${ICON.communication} 家校沟通</div>
      <div class="module-subtitle">${cls.name}</div></div>
    </div>
    ${tabBar([
      {group:'communication',id:'ledger',label:'家长台账'},
      {group:'communication',id:'visit',label:'家访记录'},
      {group:'communication',id:'meeting',label:'家长会'},
      {group:'communication',id:'notice',label:'群通知'}
    ], tab)}
    ${tabContent}
  `;
};

function addComm(type) {
  const students = getStudents();
  const showStudent = type === '家访';
  UI.modal(type, `
    <div class="form-row">
      <div class="form-group"><label class="form-label">日期</label><input class="form-input" id="cm-date" type="date" value="${todayStr()}"></div>
      ${showStudent ? `<div class="form-group"><label class="form-label">学生</label><select class="form-select" id="cm-student">${students.map(s=>`<option value="${s.id}|${s.name}">${s.no}. ${s.name}</option>`).join('')}</select></div>` : ''}
    </div>
    <div class="form-group"><label class="form-label">内容</label><textarea class="form-textarea" id="cm-content" placeholder="详细内容"></textarea></div>
    <div class="form-group"><label class="form-label">结果/备注</label><input class="form-input" id="cm-result" placeholder="结果或备注"></div>
  `, `<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button>
     <button class="btn btn-primary" onclick="saveComm('${type}')">保存</button>`);
}

function saveComm(type) {
  let studentId = '', studentName = '全班';
  if (type === '家访') {
    const [sid, sname] = document.getElementById('cm-student').value.split('|');
    studentId = sid; studentName = sname;
  }
  Store.cd('communications').unshift({
    id: Store.uid(), type, studentId, studentName,
    date: document.getElementById('cm-date').value,
    content: document.getElementById('cm-content').value,
    result: document.getElementById('cm-result').value
  });
  Store.save(); UI.closeModal(); M.communication(); UI.toast('已添加');
}

function delComm(id) {
  UI.confirm('确定删除？', () => {
    const arr = Store.cd('communications');
    const idx = arr.findIndex(c => c.id === id);
    if (idx >= 0) { arr.splice(idx, 1); Store.save(); M.communication(); UI.toast('已删除'); }
  });
}

/* ============================================================
 * 11. 待办备忘
 * ============================================================ */
M.todo = function() {
  const cls = Store.getCurrentClass();
  const todos = Store.gd('todos');
  const notes = Store.gd('notes');
  const pending = todos.filter(t => !t.done);
  const done = todos.filter(t => t.done);

  document.getElementById('content').innerHTML = `
    <div class="module-header">
      <div><div class="module-title">${ICON.todo} 待办备忘</div>
      <div class="module-subtitle">${cls.name}</div></div>
    </div>
    <div class="grid grid-2">
      <div>
        <div class="card mb-4">
          <div class="flex items-center justify-between mb-3">
            <div class="card-title" style="margin:0">${ICON.todo} 待办事项</div>
            <button class="btn btn-primary btn-sm" onclick="addTodo()">${ICON.plus} 添加</button>
          </div>
          <div class="mb-3 text-sm text-muted">待办 ${pending.length} · 已完成 ${done.length}</div>
          ${pending.length ? pending.map(t => `<div class="checkbox-item">
            <div class="custom-checkbox" onclick="toggleTodo('${t.id}')">${ICON.check}</div>
            <span class="todo-text">${esc(t.text)}</span>
            ${t.priority === 'high' ? UI.badge('紧急', 'red') : t.priority === 'medium' ? UI.badge('一般', 'amber') : ''}
            <span class="text-sm text-muted">${t.due || ''}</span>
            <button class="btn btn-danger btn-sm" onclick="delTodo('${t.id}')">删除</button>
          </div>`).join('') : ''}
          ${done.length ? `<div class="divider"></div><div class="text-sm text-muted mb-2">已完成</div>
          ${done.map(t => `<div class="checkbox-item">
            <div class="custom-checkbox checked" onclick="toggleTodo('${t.id}')">${ICON.check}</div>
            <span class="todo-text done">${esc(t.text)}</span>
            <button class="btn btn-danger btn-sm" onclick="delTodo('${t.id}')">删除</button>
          </div>`).join('')}` : ''}
          ${!todos.length ? UI.empty(ICON.todo, '暂无待办事项') : ''}
        </div>

        <div class="card">
          <div class="flex items-center justify-between mb-3">
            <div class="card-title" style="margin:0">${ICON.alert} 重要提醒</div>
          </div>
          ${pending.filter(t => t.priority === 'high').map(t => `<div class="note-card mb-2" style="border-left-color:var(--danger)">
            <div class="note-title">${esc(t.text)}</div>
            <div class="note-content">截止日期：${t.due || '未设置'}</div>
          </div>`).join('') || '<p class="text-muted text-sm">暂无紧急事项</p>'}
        </div>
      </div>

      <div class="card">
        <div class="flex items-center justify-between mb-3">
          <div class="card-title" style="margin:0">${ICON.file} 笔记</div>
          <button class="btn btn-primary btn-sm" onclick="addNote()">${ICON.plus} 添加</button>
        </div>
        ${notes.length ? notes.map(n => `<div class="note-card mb-2">
          <div class="flex items-center justify-between">
            <div class="note-title">${esc(n.title)}</div>
            <button class="btn btn-danger btn-sm" onclick="delNote('${n.id}')">删除</button>
          </div>
          <div class="note-content">${esc(n.content)}</div>
          <div class="note-date">${n.date}</div>
        </div>`).join('') : UI.empty(ICON.file, '暂无笔记')}
      </div>
    </div>
  `;
};

function addTodo() {
  UI.modal('添加待办', `
    <div class="form-group"><label class="form-label">内容</label><input class="form-input" id="td-text" placeholder="待办内容"></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">优先级</label><select class="form-select" id="td-priority"><option value="high">紧急</option><option value="medium" selected>一般</option><option value="low">低</option></select></div>
      <div class="form-group"><label class="form-label">截止日期</label><input class="form-input" id="td-due" type="date" value="${todayStr()}"></div>
    </div>
  `, `<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button>
     <button class="btn btn-primary" onclick="saveTodo()">添加</button>`);
}

function saveTodo() {
  Store.gd('todos').unshift({
    id: Store.uid(),
    text: document.getElementById('td-text').value,
    done: false,
    priority: document.getElementById('td-priority').value,
    due: document.getElementById('td-due').value
  });
  Store.save(); UI.closeModal(); M.todo(); UI.toast('已添加');
}

function toggleTodo(id) {
  const t = Store.gd('todos').find(x => x.id === id);
  if (t) { t.done = !t.done; Store.save(); M.todo(); }
}

function delTodo(id) {
  const arr = Store.gd('todos');
  const idx = arr.findIndex(t => t.id === id);
  if (idx >= 0) { arr.splice(idx, 1); Store.save(); M.todo(); UI.toast('已删除'); }
}

function addNote() {
  UI.modal('添加笔记', `
    <div class="form-group"><label class="form-label">标题</label><input class="form-input" id="nt-title" placeholder="笔记标题"></div>
    <div class="form-group"><label class="form-label">内容</label><textarea class="form-textarea" id="nt-content" placeholder="笔记内容"></textarea></div>
  `, `<button class="btn btn-ghost" onclick="UI.closeModal()">取消</button>
     <button class="btn btn-primary" onclick="saveNote()">添加</button>`);
}

function saveNote() {
  Store.gd('notes').unshift({
    id: Store.uid(),
    title: document.getElementById('nt-title').value,
    content: document.getElementById('nt-content').value,
    date: todayStr()
  });
  Store.save(); UI.closeModal(); M.todo(); UI.toast('已添加');
}

function delNote(id) {
  const arr = Store.gd('notes');
  const idx = arr.findIndex(n => n.id === id);
  if (idx >= 0) { arr.splice(idx, 1); Store.save(); M.todo(); UI.toast('已删除'); }
}

/* ============================================================
 * 12. 绘本资源
 * ============================================================ */
const PICTURE_BOOKS = [
  { id:'pb1', title:'The Very Hungry Caterpillar', category:'经典绘本', cover:'https://m.media-amazon.com/images/I/61bFUd0oJFL._AC_UF1000,1000_QL80_.jpg', desc:'好饿的毛毛虫 - 经典英语启蒙绘本' },
  { id:'pb2', title:'Brown Bear, Brown Bear', category:'经典绘本', cover:'https://m.media-amazon.com/images/I/71qK8x8ZtBL._AC_UF1000,1000_QL80_.jpg', desc:'棕色的熊 - 颜色与动物认知' },
  { id:'pb3', title:'Goodnight Moon', category:'经典绘本', cover:'https://m.media-amazon.com/images/I/71W1Bd8BpxL._AC_UF1000,1000_QL80_.jpg', desc:'晚安月亮 - 温馨睡前故事' },
  { id:'pb4', title:'The Rainbow Fish', category:'经典绘本', cover:'https://m.media-amazon.com/images/I/71w6z9g0oYL._AC_UF1000,1000_QL80_.jpg', desc:'彩虹鱼 - 分享与友谊' },
  { id:'pb5', title:'Where the Wild Things Are', category:'经典绘本', cover:'https://m.media-amazon.com/images/I/71u+P7n6GdL._AC_UF1000,1000_QL80_.jpg', desc:'野兽国 - 想象力冒险故事' },
  { id:'pb6', title:'Phonics Kids 1A', category:'Phonics', cover:'https://m.media-amazon.com/images/I/71xU+uXd1RL._AC_UF1000,1000_QL80_.jpg', desc:'自然拼读入门 - 字母发音' },
  { id:'pb7', title:'Phonics Kids 2A', category:'Phonics', cover:'https://m.media-amazon.com/images/I/71gF-+BzDRL._AC_UF1000,1000_QL80_.jpg', desc:'自然拼读进阶 - 短元音' },
  { id:'pb8', title:'Phonics Kids 3A', category:'Phonics', cover:'https://m.media-amazon.com/images/I/71gF-+BzDRL._AC_UF1000,1000_QL80_.jpg', desc:'自然拼读提升 - 长元音' },
  { id:'pb9', title:'Christmas Day', category:'节日主题', cover:'https://m.media-amazon.com/images/I/71xU+uXd1RL._AC_UF1000,1000_QL80_.jpg', desc:'圣诞节主题绘本' },
  { id:'pb10', title:'Thanksgiving Day', category:'节日主题', cover:'https://m.media-amazon.com/images/I/71gF-+BzDRL._AC_UF1000,1000_QL80_.jpg', desc:'感恩节主题绘本' },
  { id:'pb11', title:'Halloween', category:'节日主题', cover:'https://m.media-amazon.com/images/I/71W1Bd8BpxL._AC_UF1000,1000_QL80_.jpg', desc:'万圣节主题绘本' },
  { id:'pb12', title:'Reading A-Z aa', category:'分级阅读', cover:'https://m.media-amazon.com/images/I/71qK8x8ZtBL._AC_UF1000,1000_QL80_.jpg', desc:'RAZ分级阅读 - aa级别' },
  { id:'pb13', title:'Reading A-Z A', category:'分级阅读', cover:'https://m.media-amazon.com/images/I/71w6z9g0oYL._AC_UF1000,1000_QL80_.jpg', desc:'RAZ分级阅读 - A级别' },
  { id:'pb14', title:'Reading A-Z B', category:'分级阅读', cover:'https://m.media-amazon.com/images/I/71u+P7n6GdL._AC_UF1000,1000_QL80_.jpg', desc:'RAZ分级阅读 - B级别' },
  { id:'pb15', title:' worksheet-aa', category:'Worksheet', cover:'https://m.media-amazon.com/images/I/71xU+uXd1RL._AC_UF1000,1000_QL80_.jpg', desc:'配套练习册 - aa级别' },
  { id:'pb16', title:' worksheet-A', category:'Worksheet', cover:'https://m.media-amazon.com/images/I/71gF-+BzDRL._AC_UF1000,1000_QL80_.jpg', desc:'配套练习册 - A级别' },
  { id:'pb17', title:' worksheet-B', category:'Worksheet', cover:'https://m.media-amazon.com/images/I/71W1Bd8BpxL._AC_UF1000,1000_QL80_.jpg', desc:'配套练习册 - B级别' },
  { id:'pb18', title:'Three Little Pigs', category:'经典绘本', cover:'https://m.media-amazon.com/images/I/71qK8x8ZtBL._AC_UF1000,1000_QL80_.jpg', desc:'三只小猪 - 经典童话故事' },
  { id:'pb19', title:'Red Riding Hood', category:'经典绘本', cover:'https://m.media-amazon.com/images/I/71w6z9g0oYL._AC_UF1000,1000_QL80_.jpg', desc:'小红帽 - 经典童话故事' },
  { id:'pb20', title:"Mother's Day", category:'节日主题', cover:'https://m.media-amazon.com/images/I/71u+P7n6GdL._AC_UF1000,1000_QL80_.jpg', desc:'母亲节主题绘本' }
];

M.pictureBooks = function() {
  const cat = M._tabs.pbCategory || '全部';
  const categories = ['全部', ...new Set(PICTURE_BOOKS.map(b => b.category))];
  const books = cat === '全部' ? PICTURE_BOOKS : PICTURE_BOOKS.filter(b => b.category === cat);
  const activeBook = M._tabs.pbBook || null;

  if (activeBook) {
    const book = PICTURE_BOOKS.find(b => b.id === activeBook);
    if (book) {
      document.getElementById('content').innerHTML = `
        <div class="module-header">
          <div><div class="module-title">${ICON.pictureBook} ${esc(book.title)}</div>
          <div class="module-subtitle">${esc(book.category)} · ${esc(book.desc)}</div></div>
          <button class="btn btn-outline" onclick="M._tabs.pbBook=null;M.pictureBooks()">${ICON.chevronDown} 返回列表</button>
        </div>
        <div class="card">
          <div class="pb-detail">
            <div class="pb-detail-cover">
              <img src="${book.cover}" alt="${esc(book.title)}" onerror="this.style.display='none';this.parentElement.innerHTML='<div class=\'pb-no-cover\'>${ICON.book}</div>'">
            </div>
            <div class="pb-detail-info">
              <h2>${esc(book.title)}</h2>
              <div class="badge badge-green mb-2">${esc(book.category)}</div>
              <p style="color:var(--text-secondary);line-height:1.8">${esc(book.desc)}</p>
              <div class="mt-3">
                <button class="btn btn-primary" onclick="UI.toast('绘本阅读功能开发中，敬请期待！')">${ICON.book} 开始阅读</button>
                <button class="btn btn-outline" style="margin-left:8px" onclick="UI.toast('已添加到收藏')">${ICON.book} 收藏</button>
              </div>
            </div>
          </div>
        </div>
      `;
      return;
    }
  }

  document.getElementById('content').innerHTML = `
    <div class="module-header">
      <div><div class="module-title">${ICON.pictureBook} 绘本资源</div>
      <div class="module-subtitle">精选英语绘本 · 分级阅读 · 教学资源</div></div>
    </div>
    <div class="pb-categories">
      ${categories.map(c => `<div class="pb-cat ${c===cat?'active':''}" onclick="M._tabs.pbCategory='${c}';M._tabs.pbBook=null;M.pictureBooks()">${c}</div>`).join('')}
    </div>
    <div class="pb-grid">
      ${books.map(b => `
        <div class="pb-card" onclick="M._tabs.pbBook='${b.id}';M.pictureBooks()">
          <div class="pb-cover">
            <img src="${b.cover}" alt="${esc(b.title)}" onerror="this.style.display='none';this.parentElement.innerHTML='<div class=\'pb-no-cover\'>${ICON.book}</div>'">
          </div>
          <div class="pb-title">${esc(b.title)}</div>
          <div class="pb-desc">${esc(b.desc)}</div>
        </div>
      `).join('')}
    </div>
  `;
};

/* ============================================================
 * 13. 学习资源
 * ============================================================ */
M.resources = function() {
  const cls = Store.getCurrentClass();
  const resources = Store.gd('resources');

  const defaultRes = [
    {name:'人教PEP英语',url:'https://www.pep.com.cn/yy/',desc:'人教版官方英语教材资源',icon:'book',color:'#10b981'},
    {name:'国家中小学智慧教育平台',url:'https://www.zxx.edu.cn/',desc:'国家级优质教育资源',icon:'globe',color:'#3b82f6'},
    {name:'21世纪英语教育',url:'https://www.i21st.cn/',desc:'英语教学资讯与资源',icon:'newsIcon',color:'#f59e0b'},
    {name:'可可英语',url:'https://www.kekenet.com/',desc:'英语听力与口语练习',icon:'audio',color:'#8b5cf6'},
    {name:'百词斩',url:'https://www.baicizhan.com/',desc:'单词记忆工具',icon:'word',color:'#ec4899'},
    {name:'英语点读',url:'https://www.hjenglish.com/',desc:'课本同步点读',icon:'mic',color:'#06b6d4'},
    {name:'菁优网',url:'https://www.jyeoo.com/',desc:'海量题库与组卷平台',icon:'file',color:'#059669'},
    {name:'学科网',url:'https://www.zxxk.com/',desc:'中小学教学资源下载',icon:'folder',color:'#2563eb'},
    {name:'Gamma',url:'https://gamma.app/',desc:'AI演示文稿生成工具',icon:'image',color:'#7c3aed'},
    {name:'Trae',url:'https://www.trae.ai/',desc:'AI编程与教学辅助',icon:'code',color:'#db2777'},
    {name:'优秀论文阅读',url:'https://kns.cnki.net/kns8s/AdvSearch?classid=YSTT4HG0',desc:'知网教育类论文检索',icon:'book',color:'#dc2626'},
    {name:'Starfall',url:'https://www.starfall.com/',desc:'儿童英语启蒙',icon:'book',color:'#10b981'},
    {name:'BBC Learning English',url:'https://www.bbc.co.uk/learningenglish/',desc:'BBC英语学习',icon:'globe',color:'#3b82f6'},
    {name:'Khan Academy Kids',url:'https://www.khanacademy.org/kids',desc:'可汗学院儿童版',icon:'book',color:'#f59e0b'},
    {name:'Quizlet',url:'https://quizlet.com/',desc:'单词卡片学习',icon:'word',color:'#8b5cf6'}
  ];
  const allRes = resources.length ? resources : defaultRes;

  document.getElementById('content').innerHTML = `
    <div class="module-header">
      <div><div class="module-title">${ICON.resources} 英语学习资源</div>
      <div class="module-subtitle">${cls.name} · 精选资源导航</div></div>
    </div>
    <div class="grid grid-auto">
      ${allRes.map(r => `
        <a class="resource-card" href="${r.url}" target="_blank">
          <div class="res-icon" style="background:${r.color}15;color:${r.color}">${ICON[r.icon] || ICON.book}</div>
          <div class="res-name">${esc(r.name)}</div>
          <div class="res-desc">${esc(r.desc)}</div>
          <div class="mt-2 flex items-center gap-1 text-sm" style="color:${r.color}">
            ${ICON.external} <span>访问</span>
          </div>
        </a>
      `).join('')}
    </div>
  `;
};

/* ============================================================
 * 13. 教师锦囊
 * ============================================================ */
const TEACHER_KIT_DATA = {
  management: [
    { q: '学生上课总说话，怎么管理？', a: '1. 建立课堂规则：开学初和学生共同制定"发言举手"规则，贴在教室显眼处。2. 正向激励：设立"安静之星"奖励，每节课表现好的小组加分。3. 眼神+走近：发现学生说话时不停止讲课，用眼神示意或走近学生身旁。4. 课后谈话：单独找学生了解原因，可能是听不懂或精力过剩，针对性解决。5. 调整教学：增加互动环节，让学生有合法发言的机会。' },
    { q: '学生不按时交作业，怎么处理？', a: '1. 了解原因：是不会做、忘记带还是态度问题。2. 分层要求：对学困生降低难度，先完成基础题。3. 建立责任制：小组长负责收作业并记录，老师每天检查。4. 家校联动：连续3次不交联系家长，共同督促。5. 及时反馈：作业批改后当天发回，让学生看到老师的重视。' },
    { q: '班上两极分化严重，怎么兼顾？', a: '1. 分层教学：同一节课设计基础题+提高题+拓展题。2. 小组合作：强弱搭配，让优生带动后进生。3. 课后辅导：利用午休或课后20分钟单独辅导学困生。4. 个性化作业：优生增加阅读/拓展任务，后进生巩固基础。5. 多元评价：不仅看分数，也表扬进步幅度大的学生。' },
    { q: '学生上课玩手机/玩东西怎么办？', a: '1. 明确规则：开学第一课强调电子产品一律上交。2. 代为保管：发现后先收起来，放学再归还，不批评只执行规则。3. 替代活动：准备英语小游戏、手指操等转移注意力。4. 家校沟通：如果是 habitual 行为，联系家长共同制定管理方案。5. 关注需求：有时是因为课程太难或太简单，调整教学节奏。' },
    { q: '如何管理课堂纪律又不伤学生自尊？', a: '1. 对事不对人：批评行为而不是人格，如"这个行为影响了大家"而不是"你怎么这么不听话"。2. 私下提醒：小问题走到学生旁边轻声提醒，不当众点名。3. 幽默化解：用轻松的语气化解尴尬，如"这位同学的想法很有趣，下课我们单独聊聊"。4. 给予选择："你是现在安静下来，还是站到后面冷静一下？"5. 事后谈心：课后单独沟通，让学生感受到被尊重。' },
    { q: '学生之间发生矛盾冲突，怎么调解？', a: '1. 分开冷静：先把双方分开，等情绪平复再处理。2. 分别倾听：让每个人先说自己的感受和事实，不急于评判。3. 还原事实：帮助双方理解对方的立场和感受。4. 共同解决：引导学生自己想出解决方案，而不是老师强加。5. 持续关注：之后几天观察两人互动，必要时再次沟通。' },
    { q: '如何激励后进生学习？', a: '1. 降低门槛：先从最简单的任务开始，让他体验到成功。2. 及时表扬：哪怕很小的进步也要当众表扬。3. 安排小助手：让友善的优生帮助他，建立同伴支持。4. 联系家长：和家长沟通时先夸进步，再提建议，形成正向循环。5. 兴趣切入：从他感兴趣的话题引入英语学习，如游戏、动漫等。' },
    { q: '家长质疑教学方式，怎么回应？', a: '1. 先肯定：感谢家长关心孩子学习，认可家长的用心。2. 解释理念：用通俗语言说明教学方法的目的，如"小组讨论是为了培养合作能力"。3. 展示成果：给家长看孩子的课堂表现记录或作品。4. 邀请参与：邀请家长来听一节公开课，亲身感受。5. 达成共识：和家长一起制定适合这个孩子的个性化方案。' }
  ],
  parentReply: [
    { q: '家长说：老师，我家孩子英语成绩怎么下降了？', a: '回复模板：\n\nXX家长您好！感谢您对孩子学习的关注。我查看了孩子近期的表现，发现主要在[单词拼写/语法运用/听力理解]方面需要加强。\n\n建议我们一起配合：\n1. 每天在家听读英语15分钟\n2. 周末复习本周所学单词\n3. 下周我会特别关注孩子课堂状态\n\n孩子很有潜力，只要坚持一定会有进步的！有问题随时联系。' },
    { q: '家长说：作业太多了，孩子做到很晚！', a: '回复模板：\n\nXX家长您好！非常理解您的担心，孩子休息好确实很重要。\n\n目前英语作业一般控制在20-30分钟内完成。如果孩子经常做到很晚，可能是：\n1. 基础薄弱导致做题速度慢 → 建议先从复习课本开始\n2. 注意力不集中 → 建议固定学习时间，减少干扰\n3. 部分题目确实有难度 → 可以让孩子先标记，我来单独辅导\n\n我们随时沟通，找到最适合孩子的节奏。' },
    { q: '家长说：老师能不能多关照一下我家孩子？', a: '回复模板：\n\nXX家长您好！请放心，每个孩子我都会用心关注的。\n\n针对您家孩子，我接下来会：\n1. 课堂上多给他发言机会，增强自信心\n2. 作业批改时写具体评语，指出改进方向\n3. 每周五反馈一次本周表现给您\n\n也欢迎您随时和我交流孩子在家学习的情况，我们一起帮助孩子进步！' },
    { q: '家长说：我们家孩子就是不爱学英语，怎么办？', a: '回复模板：\n\nXX家长您好！这种情况其实很常见，不必太焦虑。\n\n我们可以尝试：\n1. 从兴趣入手：看英文动画片、听英文儿歌，先培养语感\n2. 降低难度：先从简单的单词和对话开始，积累成就感\n3. 正向激励：设定小目标，完成后给予适当奖励\n4. 同伴影响：鼓励孩子和班上英语好的同学多交流\n\n兴趣是最好的老师，我们一起耐心引导！' },
    { q: '家长说：老师，我家孩子被同学欺负了', a: '回复模板：\n\nXX家长您好！非常抱歉孩子遇到了这样的情况，我马上了解情况。\n\n请您先告诉我：\n1. 具体是什么时候发生的？\n2. 涉及哪些同学？\n3. 孩子是身体受伤还是心理上不舒服？\n\n我会在明天[谈话调解/调整座位/联系对方家长]，并在处理完第一时间告诉您结果。\n\n孩子的安全和心理健康是最重要的，请放心！' },
    { q: '家长说：老师你布置的作业我孩子听不懂', a: '回复模板：\n\nXX家长您好！感谢您的反馈，这对我改进教学很有帮助。\n\n可能的原因：\n1. 课堂内容没完全吸收 → 我会在明天课堂上再复习一遍\n2. 作业要求没写清楚 → 以后我会在群里详细说明\n3. 孩子自己没记全 → 建议让孩子准备一个作业记录本\n\n今晚的作业如果确实不会做，可以先放一放，明天我会单独辅导。再次感谢您的沟通！' },
    { q: '家长说：能不能给我家孩子调个好座位？', a: '回复模板：\n\nXX家长您好！理解您希望孩子有更好的学习环境。\n\n关于座位安排，我会综合考虑：\n1. 视力情况（近视的孩子尽量靠前）\n2. 纪律表现（需要老师关注的孩子放在前面）\n3. 身高因素（不影响后排同学视线）\n4. 学习互助（强弱搭配，促进共同进步）\n\n我会特别关注您家孩子的座位情况，如有调整会在下周执行，并告知您。' },
    { q: '家长说：老师，孩子说你上课太凶了', a: '回复模板：\n\nXX家长您好！首先感谢您坦诚地告诉我，这很难得。\n\n我的课堂风格确实比较严格，目的是为了让孩子们养成良好的学习习惯。如果让孩子感到害怕了，那是我的方式需要调整。\n\n请您帮我了解：\n1. 具体是哪一次课堂让孩子有这种感觉？\n2. 孩子希望我怎么做他会更舒服？\n\n我会注意调整自己的语气，在严格要求的同时多给予鼓励。谢谢您的宝贵反馈！' }
  ]
};

M.teacherKit = function() {
  const tab = M._tabs.teacherKit || 'management';
  const data = TEACHER_KIT_DATA[tab] || [];
  const activeQ = M._tabs.tkQuestion || null;
  const editId = M._tabs.tkEdit || null;
  const customQA = Store.gd('customKitQA') || [];
  const filteredCustom = customQA.filter(c => c.category === tab);

  document.getElementById('content').innerHTML = `
    <div class="module-header">
      <div><div class="module-title">${ICON.teacherKit} 教师锦囊</div>
      <div class="module-subtitle">AI 助力 · 班级管理与家长沟通</div></div>
    </div>

    <!-- 自由提问区 -->
    <div class="card mb-4" style="border:2px solid var(--primary);border-left:4px solid var(--primary)">
      <div class="card-title">${ICON.edit} 向AI提问</div>
      <div class="tk-input-row">
        <input class="tk-custom-input" id="kitInput" placeholder="输入任何班级管理或家长沟通的问题，获取AI建议..." onkeydown="if(event.key==='Enter')kitAsk()">
        <button class="btn btn-primary" onclick="kitAsk()">${ICON.teacherKit} 提问</button>
      </div>
      <div id="kitResult" style="margin-top:8px;display:none">
        <div class="tk-a" style="border:none;padding:16px;background:var(--primary-bg);border-radius:8px;">
          <div class="flex items-center justify-between mb-2">
            <div class="tk-a-label">AI建议回复：</div>
            <div style="display:flex;gap:4px">
              <button class="btn btn-ghost btn-sm" onclick="kitCopyAnswer()">${ICON.file} 复制</button>
              <button class="btn btn-ghost btn-sm" onclick="kitSaveQA()">${ICON.plus} 收藏</button>
            </div>
          </div>
          <div id="kitAnswer" style="font-size:13px;line-height:1.8;color:var(--text-secondary)"></div>
        </div>
      </div>
    </div>

    ${tabBar([
      {group:'teacherKit',id:'management',label:'班级管理难题'},
      {group:'teacherKit',id:'parentReply',label:'家长高情商回复'}
    ], tab)}

    <!-- 系统锦囊 -->
    <div class="tk-list">
      <div class="tk-section-title">${ICON.book} 系统锦囊</div>
      ${data.map((item, idx) => `
        <div class="tk-item ${activeQ === idx ? 'active' : ''}">
          <div class="tk-q" onclick="M._tabs.tkQuestion=${activeQ===idx?'null':idx};M._tabs.tkEdit=null;M.teacherKit()">
            <span class="tk-num">${idx+1}</span>${esc(item.q)}
          </div>
          ${activeQ === idx ? `<div class="tk-a" id="tk-a-${idx}">
            <div class="flex items-center justify-between mb-1">
              <div class="tk-a-label">建议回复：</div>
              <button class="btn btn-ghost btn-sm" onclick="M._tabs.tkEdit='${idx}';M.teacherKit()">${ICON.edit} 编辑</button>
            </div>
            ${editId === idx ? `<textarea class="tk-edit-area" id="tk-edit-text">${esc(item.a)}</textarea>
            <div style="margin-top:6px;display:flex;gap:4px">
              <button class="btn btn-primary btn-sm" onclick="kitUpdateAnswer('${tab}',${idx})">${ICON.check} 保存修改</button>
              <button class="btn btn-ghost btn-sm" onclick="M._tabs.tkEdit=null;M.teacherKit()">取消</button>
            </div>` : `<div>${esc(item.a).replace(/\\n/g,'<br>')}</div>`}
          </div>` : ''}
        </div>
      `).join('')}
    </div>

    <!-- 自定义锦囊 -->
    ${filteredCustom.length ? `
    <div class="tk-list mt-3">
      <div class="tk-section-title">${ICON.todo} 我的锦囊 <span class="text-sm text-muted">${filteredCustom.length}条</span></div>
      ${filteredCustom.map((item, idx) => {
        const cid = 'custom_'+idx;
        const customActive = M._tabs.tkQuestion === cid;
        const customEdit = M._tabs.tkEdit === cid;
        return `<div class="tk-item custom ${customActive ? 'active' : ''}">
          <div class="tk-q" onclick="M._tabs.tkQuestion=${customActive?'null':"'${cid}'"};M._tabs.tkEdit=null;M.teacherKit()">
            <span class="tk-num" style="background:var(--primary)">${idx+1}</span>${esc(item.q)}
            <span class="text-sm text-muted" style="margin-left:auto">${item.date}</span>
          </div>
          ${customActive ? `<div class="tk-a">
            <div class="flex items-center justify-between mb-1">
              <div class="tk-a-label">我的记录：</div>
              <div style="display:flex;gap:4px">
                <button class="btn btn-ghost btn-sm" onclick="M._tabs.tkEdit='${cid}';M.teacherKit()">${ICON.edit} 编辑</button>
                <button class="btn btn-danger btn-sm" onclick="kitDelCustom('${item.id}')">${ICON.trash} 删除</button>
              </div>
            </div>
            ${customEdit ? `<textarea class="tk-edit-area" id="tk-edit-text">${esc(item.a)}</textarea>
            <div style="margin-top:6px;display:flex;gap:4px">
              <button class="btn btn-primary btn-sm" onclick="kitUpdateCustom('${item.id}')">${ICON.check} 保存</button>
              <button class="btn btn-ghost btn-sm" onclick="M._tabs.tkEdit=null;M.teacherKit()">取消</button>
            </div>` : `<div>${esc(item.a).replace(/\\n/g,'<br>')}</div>`}
          </div>` : ''}
        </div>`;
      }).join('')}
    </div>` : ''}

    <div class="card mt-3" style="background:var(--primary-light)">
      <div class="card-title">${ICON.info} 使用提示</div>
      <div class="text-sm" style="line-height:1.8;color:var(--text-secondary)">
        1. 点击问题展开查看建议回复<br>
        2. 点击「编辑」可自定义修改答案<br>
        3. 顶部输入框可自由提问，AI实时生成建议<br>
        4. 收藏的内容自动保存在"我的锦囊"中
      </div>
    </div>
  `;
};

/* ===== 教师锦囊辅助函数 ===== */
let _kitLastAnswer = '';
function kitAsk() {
  const input = document.getElementById('kitInput');
  const q = (input.value||'').trim();
  if(!q) return;
  const resultEl = document.getElementById('kitResult');
  const answerEl = document.getElementById('kitAnswer');
  resultEl.style.display = 'block';
  answerEl.innerHTML = '<span style="color:var(--text-tertiary)">AI思考中...</span>';
  setTimeout(() => {
    const tab = M._tabs.teacherKit || 'management';
    const a = generateAIResponse(q, tab);
    _kitLastAnswer = a;
    answerEl.innerHTML = a.replace(/\\n/g,'<br>');
  }, 600);
}
function kitCopyAnswer() {
  const text = _kitLastAnswer || document.getElementById('kitAnswer').innerText;
  navigator.clipboard.writeText(text).then(()=>UI.toast('已复制')).catch(()=>UI.toast('复制失败'));
}
function kitSaveQA() {
  const q = (document.getElementById('kitInput').value||'').trim();
  if(!q || !_kitLastAnswer) return;
  const custom = Store.gd('customKitQA');
  custom.unshift({id:Store.uid(),q:q,a:_kitLastAnswer,date:todayStr(),category:M._tabs.teacherKit||'management'});
  Store.save();
  document.getElementById('kitInput').value = '';
  document.getElementById('kitResult').style.display = 'none';
  _kitLastAnswer = '';
  UI.toast('已保存到我的锦囊');
}
function kitUpdateAnswer(tab, idx) {
  const val = document.getElementById('tk-edit-text').value;
  if(val && TEACHER_KIT_DATA[tab] && TEACHER_KIT_DATA[tab][idx]) {
    TEACHER_KIT_DATA[tab][idx].a = val;
    M._tabs.tkEdit = null;
    M.teacherKit();
    UI.toast('已更新');
  }
}
function kitUpdateCustom(id) {
  const val = document.getElementById('tk-edit-text').value;
  const custom = Store.gd('customKitQA');
  const item = custom.find(c=>c.id===id);
  if(item && val) { item.a = val; Store.save(); M._tabs.tkEdit = null; M.teacherKit(); UI.toast('已更新'); }
}
function kitDelCustom(id) {
  const arr = Store.gd('customKitQA');
  const idx = arr.findIndex(c=>c.id===id);
  if(idx>=0) { arr.splice(idx,1); Store.save(); M._tabs.tkQuestion = null; M.teacherKit(); UI.toast('已删除'); }
}

/* ============================================================
 * 14. 时政热点
 * ============================================================ */
M.news = function() {
  const cls = Store.getCurrentClass();
  const news = Store.gd('news');

  document.getElementById('content').innerHTML = `
    <div class="module-header">
      <div><div class="module-title">${ICON.news} 时政热点</div>
      <div class="module-subtitle">教育资讯 · 英语教学动态</div></div>
    </div>
    <div class="grid grid-2">
      ${news.map(n => `
        <div class="card" style="cursor:pointer" onclick="window.open('${n.url}','_blank')">
          <div class="flex items-center gap-2 mb-2">
            ${UI.badge(n.source, 'green')}
            <span class="text-sm text-muted">${n.date}</span>
          </div>
          <div style="font-weight:700;font-size:15px;line-height:1.4;margin-bottom:8px">${esc(n.title)}</div>
          <div class="text-sm" style="color:var(--text-secondary);line-height:1.6">${esc(n.summary)}</div>
          <div class="mt-3 flex items-center gap-1 text-sm" style="color:var(--primary)">
            ${ICON.external} <span>阅读详情</span>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="card mt-4">
      <div class="card-title">${ICON.globe} 教育资讯直达</div>
      <div class="grid grid-auto">
        ${[
          {name:'教育部官网',url:'http://www.moe.gov.cn/',desc:'教育部官方网站',color:'#10b981'},
          {name:'中国教育报',url:'http://www.jyb.cn/',desc:'教育行业权威媒体',color:'#3b82f6'},
          {name:'中国教育新闻网',url:'http://www.jyb.cn/rmtzcg/xwy/wzxw/',desc:'教育新闻聚合',color:'#f59e0b'},
          {name:'人民教育出版社',url:'https://www.pep.com.cn/',desc:'人教社官网',color:'#8b5cf6'}
        ].map(r => `<a class="resource-card" href="${r.url}" target="_blank">
          <div class="res-icon" style="background:${r.color}15;color:${r.color}">${ICON.globe}</div>
          <div class="res-name">${r.name}</div>
          <div class="res-desc">${r.desc}</div>
        </a>`).join('')}
      </div>
    </div>
  `;
};
