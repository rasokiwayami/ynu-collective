(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const flow = document.querySelector('.flow'), chat = flow.querySelector('.chat'), list = chat.querySelector('ol');
  const box = flow.querySelector('.made-box');
  // 完成品：てのひら分子の本体を、分子と「手で動かす」だけの表示（?embed=1）で枠に入れる
  const APP = 'https://rasokiwayami.github.io/molecule-viewer/' + '?m=caffeine&embed=1';

  // ---- 会話。[だれ, 文, 次までの間(ms), 返す前に考えている時間(ms)] ----
  // てのひら分子の変更の履歴の順に書き起こした。はじめはゆっくり、だんだん速くなる。
  const TALK = [
    ['me', '名前を入れると分子が立体で現れて、カメラに映した自分の手の動きに合わせて回るWebアプリを作りたい', 0],
    ['ai', '分子のデータは、どこから取りますか', 2000, 1900],
    ['me', '公開されているデータベースから。よく使う分子は最初から入れておいて', 2000],
    ['ai', 'PubChemの立体構造を使います。よく使う40種を内蔵しました', 1900],
    ['me', '見た目は、暗い背景に光る感じで', 1500],
    ['ai', '原子を元素ごとに色分けし、二重結合と三重結合も描き分けました', 1500],
    ['me', '手はどうやって読み取るの', 1200],
    ['ai', 'カメラの映像から、手の関節の位置を端末の中で推定します', 1300],
    ['ai', '片手でつまむと回転、両手でつまむと拡大にしました', 1000],
    ['me', '大きい分子が画面からはみ出す', 700],
    ['ai', '画面に収まる大きさに合わせるようにしました', 560],
    ['me', '読み込みが重い', 450],
    ['ai', '配るファイルと描画を軽くしました', 400],
    ['me', '回すとカクカクする', 350],
    ['ai', '回転と拡大が、指をなめらかに追うようにしました', 300],
    ['ai', '手の検出を裏で動かし、画面が止まらないようにしました', 260],
    ['me', '手の動きに、もっと自然についてきてほしい', 240],
    ['ai', 'ばねのように追いかける動きにしました', 220],
    ['ai', '試験を24件通しました', 450],
    ['ai', 'できました', 800],
  ];
  const ME = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><circle cx="8" cy="5.4" r="2.7"/><path d="M2.6 14.2c.5-3 2.7-4.6 5.4-4.6s4.9 1.6 5.4 4.6"/></svg>';
  const AI = '<img src="img/blossom-black.svg" alt="">';
  let timer = 0, at = 0;

  // ---- 音。吹き出し1つにつき短い音を1回だけ鳴らす（鳴り続ける音は使わない）。
  // ブラウザは操作の前に音を出せないので、右上のボタンを押した人にだけ鳴らす。
  const toggle = document.querySelector('.sound');
  let ctx = null, on = false;
  // 効果音は Kenney の Interface Sounds（CC0）。差し替えるときは、ここの名前と sound/ のファイルを変える。
  const FILES = { me: 'drop_004', ai: 'drop_003', made: 'confirmation_002' }, buf = {};
  async function loadSounds() {
    await Promise.all(Object.entries(FILES).map(async ([kind, name]) => {
      buf[kind] ||= await ctx.decodeAudioData(await (await fetch(`sound/${name}.mp3`)).arrayBuffer());
    }));
  }
  function sound(kind) {
    if (!on || !ctx || !buf[kind] || document.hidden) return;
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = buf[kind]; g.gain.value = .5;
    src.connect(g).connect(ctx.destination); src.start();
  }
  function setSound(v) { // 音を出す・止める。出すときは、音の読み込みが済んでから返る
    on = v;
    toggle.setAttribute('aria-pressed', on); toggle.textContent = on ? '音：オン' : '音：オフ';
    if (!on) { ctx?.suspend(); return Promise.resolve(); }
    ctx ||= new (window.AudioContext || window.webkitAudioContext)(); ctx.resume();
    return loadSounds().catch(() => {});
  }
  toggle.addEventListener('click', () => setSound(!on).then(() => sound('me')));

  const wait = (fn, ms) => { timer = setTimeout(fn, ms); };
  const bottom = quick => chat.scrollTo({ top: chat.scrollHeight, behavior: quick ? 'auto' : 'smooth' });

  function add(i, quick, thinking) {
    const [who, text, gap] = TALK[i];
    const li = document.createElement('li');
    li.className = `msg ${who}${i === 0 ? ' first' : ''}${thinking ? ' think' : ''}`;
    li.style.setProperty('--t', `${Math.max(.18, Math.min(.7, gap / 1400))}s`);
    li.innerHTML = `<span class="who">${who === 'me' ? ME : AI}</span><p></p>`;
    li.querySelector('.who').setAttribute('aria-label', who === 'me' ? '頼む人' : 'AI');
    const p = li.querySelector('p');
    if (thinking) p.innerHTML = '<i></i><i></i><i></i>'; else p.textContent = text;
    list.append(li);
    if (quick) li.classList.add('in'); else requestAnimationFrame(() => requestAnimationFrame(() => li.classList.add('in')));
    bottom(quick);
    if (!quick && !thinking) sound(who);
    return li;
  }

  // 一言目は、全体が一目で読める大きさまで拡大して出す。そのあと引いて、会話の画面だと分かるようにする
  function zoomOff() { list.style.transition = ''; list.style.transform = ''; chat.classList.remove('zoom'); }
  function opening() {
    const li = add(0, true); at = 1;
    const p = li.querySelector('p').getBoundingClientRect(), c = chat.getBoundingClientRect(), l = list.getBoundingClientRect();
    const k = Math.min(2.2, (c.width - 32) / p.width), mx = p.left + p.width / 2, my = p.top + p.height / 2;
    chat.classList.add('zoom');
    list.style.transition = 'none';
    list.style.transformOrigin = `${mx - l.left}px ${my - l.top}px`;
    list.style.transform = `translate(${c.left + c.width / 2 - mx}px, ${c.top + c.height * .42 - my}px) scale(${k})`;
    li.classList.add('pop'); sound('me');
    wait(() => { zoomOff(); wait(step, 1900); }, 2600);
  }

  let cue = 0;
  function done(quiet) {
    flow.classList.add('made');
    if (!quiet) sound('made');
    cue = setTimeout(() => flow.classList.add('cue'), reduce ? 0 : 6000); // 少し触ってもらってから、下への誘いを出す
    const t0 = performance.now(); // 会話の枠が縮むあいだ、最後の発言が見える位置に保つ
    const keep = now => { chat.scrollTop = chat.scrollHeight; if (now - t0 < 1900) requestAnimationFrame(keep); };
    requestAnimationFrame(keep);
  }
  function step() {
    if (at >= TALK.length) { done(); return; }
    const think = TALK[at][3];
    if (think) { // 返事の前に、考えている様子を出す
      const li = add(at, false, true);
      wait(() => { li.classList.remove('think'); li.querySelector('p').textContent = TALK[at][1]; bottom(); sound('ai'); wait(step, TALK[at++][2]); }, think);
      return;
    }
    add(at, false);
    wait(step, TALK[at++][2]);
  }
  function finish() { // 残りを一度に出して、作ったものへ進む
    clearTimeout(timer); zoomOff();
    const t = list.querySelector('.think');
    if (t) { t.classList.remove('think'); t.querySelector('p').textContent = TALK[at++][1]; }
    while (at < TALK.length) add(at++, true);
    done(reduce);
  }
  function play() {
    clearTimeout(timer); at = 0; list.textContent = ''; clearTimeout(cue); flow.classList.remove('made', 'cue'); zoomOff();
    if (!box.querySelector('iframe')) { // 会話のあいだに読み込んでおく
      const f = document.createElement('iframe');
      f.src = APP; f.title = 'てのひら分子：カフェインの分子の模型'; f.allow = 'camera';
      box.prepend(f);
    }
    if (reduce) finish(); else wait(opening, 400);
  }
  chat.addEventListener('click', () => { if (!flow.classList.contains('made')) finish(); });
  box.querySelector('.again').addEventListener('click', play);
  // はじめに音を出すかを選んでもらう。押した操作で音が出せるようになり、そこから会話が始まる
  const gate = flow.querySelector('.gate');
  // 見出しは1文字ずつ、ぼけた状態から焦点が合うように出す。出そろってからボタンを出す
  let n = 0;
  for (const line of gate.querySelectorAll('h1 span')) {
    const text = line.textContent; line.textContent = ''; line.setAttribute('aria-hidden', 'true');
    for (const ch of text) { const i = document.createElement('i'); i.textContent = ch; i.style.animationDelay = `${.35 + n++ * .07}s`; line.append(i); }
    n += 4; // 行の変わり目で一拍おく
  }
  gate.style.setProperty('--after', `${.35 + n * .07 + .5}s`);
  if (reduce) { gate.remove(); play(); }
  else gate.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    gate.classList.add('off'); setTimeout(() => gate.remove(), 700);
    // 音の読み込みが遅くても、1.5秒で始める
    Promise.race([setSound(b.dataset.sound === 'on'), new Promise(r => setTimeout(r, 1500))]).then(play);
  });
})();

// 申し込みの画面が見えている間は、下に固定したボタンを隠す
(() => {
  const bar = document.querySelector('.bar'), apply = document.querySelector('.apply');
  if (bar && apply) new IntersectionObserver(([e]) => bar.classList.toggle('off', e.isIntersecting), { threshold: .3 }).observe(apply);
})();
