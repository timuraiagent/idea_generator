# Главы «Башни». Глава с новой фичей: ввод (1 этаж, без спешки) → закрепление (2–3 этажа) → три башни по нарастающей с котом.
# «Мастерская» — без новых правил: пять башен из выученного, теснее по палкам и по времени.
# tf — множитель таймера к времени бота (меньше — труднее); без tf таймера нет.
N = dict(narrow=True)

# ---------------- 1. Палка ----------------
a = M('Палка в колесо', 'A stick in the wheel', 'Мышонок боится молота. Ткни в колесо, когда дырка под зелёной стрелкой, — молот замрёт, и мышонок добежит до сыра.',
      'The mouse fears the hammer. Tap the wheel when a hole is under the green arrow — the hammer freezes and the mouse reaches the cheese.', 1, sticks=4, extra='scaffold:true,')
a.one(0, 2, rps=.24)
b = M('Оба сразу', 'Both at once', 'Палка держит 6 секунд и ломается. Мышонок побежит, только когда стоят ОБА молота.',
      'A stick holds 6 seconds, then snaps. The mouse runs only when BOTH hammers stand still.', 1, sticks=4)
b.two(0)
c = M('Первая башня', 'The first tower', 'Башня в три этажа. Мышонок пробегает этаж и лезет по лестнице выше: на лестнице он в безопасности. Палки общие на всю башню.',
      'A three-floor tower. The mouse crosses a floor and climbs the ladder: on a ladder it is safe. The sticks are shared by the whole tower.', 3, sticks=5)
for k, r in enumerate([.22, .25, .2]): c.one(k, 2, rps=r)
d = M('Не забегай вперёд', 'Do not run ahead', 'Палки тут держат 3,5 секунды. Заклинишь верхний этаж заранее — палка сломается раньше, чем мышонок долезет. Наверху молоты стоят парами.',
      'Sticks hold 3.5 seconds here. Jam an upper floor too early and the stick snaps before the mouse gets there. Higher up the hammers come in pairs.', 5, sticks=8, life=3.5)
d.one(0, 2, rps=.22); d.one(1, 2, rps=.26); d.one(2, 2, rps=.2); d.two(3); d.two(4)
e = M('Кот', 'The cat', 'Первая палка будит кота: внизу пошёл отсчёт. Пролез лестницу без остановки — кот дремлет лишнюю секунду. Палка держит 3 секунды.',
      'The first stick wakes the cat: the countdown starts below. Take a ladder without stopping and the cat dozes one more second. A stick holds 3 seconds.', 6, sticks=10, life=3, tf=2.6)
e.one(0, 2, rps=.24); e.two(1); e.one(2, 1, rps=.3); e.two(3, 2, 1); e.one(4, 1, rps=.3); e.two(5, 1, 1, rps=.28)
chapter('Палка', 'The stick', '#e9c46a', [a, b, c, d, e])

# ---------------- 2. Ремень ----------------
a = M('Ремень', 'The belt', 'В серых колёсах нет дырок — их не заклинить. Но их крутит ремень от колеса справа: останови его — встанут оба молота.',
      'The grey wheels have no holes — they cannot be jammed. But a belt from the wheel on the right drives them: stop it and both hammers stop.', 1, sticks=3)
a.driven2(0)
b = M('Одно за двоих', 'One for two', 'Привод справа крутит молоты на двух этажах. А у второго молота наверху есть своя дырка. Палок три.',
      'The drive on the right turns hammers on two floors. And the second hammer upstairs has a hole of its own. Three sticks.', 2, sticks=3)
b.shared(0, 2, ['m', '1']); b.one(1, 2, '2')
c = M('Общий привод', 'A shared drive', 'Привод крутит молоты сразу на двух этажах — хватит одной палки, если не мешкать. Наверху привод крутит оба молота разом. И кот не спит.',
      'One drive turns hammers on two floors at once — one stick is enough if you do not linger. At the top one drive turns both hammers. And the cat is awake.', 5, sticks=6, life=4, tf=2.4)
c.one(0, 2, rps=.24); c.shared(1, 2); c.two(3)
dd = c.drv(bx(4) + 165, 2, .24); c.ham(4, '1', 2, .2, dd); c.ham(4, '2', 2, .2, dd); c.put(4, dd, 'N')
d = M('Лесенка', 'The ladder', 'Каждый привод крутит молот под лестницей и молот над ней. На этаже должны стоять оба соседних привода. Палка держит 4 секунды — держи ритм.',
      'Each drive turns the hammer below a ladder and the one above it. Both neighbouring drives must stand still on a floor. A stick holds 4 seconds — keep the rhythm.', 5, sticks=5, life=4, tf=2.1)
D = [d.drv(bx(j), 2, r) for j, r in zip(range(1, 5), [.25, .22, .27, .24])]
for j, q in enumerate(D): d.ham(j, '2', 0, .2, q); d.ham(j + 1, '1', 0, .2, q)
d.sol = [[D[0]], [D[0], D[1]], [D[1], D[2]], [D[2], D[3]], [D[3]]]
e = M('Всё про ремни', 'All about belts', 'Приводы крутят молоты на двух этажах. У некоторых молотов есть и свои дырки — но палок на всё не хватит. Палка держит 3,5 секунды.',
      'The drives turn hammers across two floors. Some hammers have holes of their own — but there are not enough sticks for everything. A stick holds 3.5 seconds.', 6, sticks=8, life=3.5, tf=1.9)
p1 = e.ham(0, '1', 2, .24); p2 = e.ham(0, '2', 2, .2); t1 = e.drv(bx(2), 2, .23); e.ham(1, 'm', 2, .2, t1); e.ham(2, 'm', 2, .2, t1)
p3 = e.ham(3, 'm', 1, .3); p4 = e.ham(4, '1', 2, .26); t2 = e.drv(bx(5), 2, .22); e.ham(4, '2', 0, .2, t2); e.ham(5, '1', 0, .2, t2); p5 = e.ham(5, '2', 2, .24)
e.sol = [[p1, p2], [t1], [t1], [p3], [p4, t2], [t2, p5]]
chapter('Ремень', 'The belt', '#ff9a3c', [a, b, c, d, e])

# ---------------- 3. Решётка ----------------
a = M('Решётка', 'The gate', 'Решётка открыта, пока её колесо крутится. Колесо справа крутит решётку — его не трогай. Останови только молот.',
      'The gate stays open while its wheel spins. The wheel on the right drives the gate — leave it alone. Stop only the hammer.', 1, sticks=3)
g = a.drv(bx(0) + 165, 2, .22); a.gate(0, '2', g); a.one(0, 2, '1')
b = M('Решётка подождёт', 'The gate can wait', 'Привод первого молота держит решётку на третьем этаже. Заклинишь его — решётка упадёт, но мышонок туда ещё не долез. Не трать палку у решётки раньше времени.',
      'The drive of the first hammer holds the gate on the third floor. Jam it and the gate drops, but the mouse is not there yet. Do not spend the stick by the gate too early.', 3, sticks=4, life=4)
b.gate_ahead(0, 2); b.one(1); b.one(2, 2, '2')
c = M('Привод и решётка', 'Drive and gate', 'Привод внизу держит решётку на третьем этаже. Выше — пара молотов и одна дырка на колесо. Кот не спит.',
      'The drive at the bottom holds the gate on the third floor. Higher up: a pair of hammers and single-hole wheels. The cat is awake.', 5, sticks=7, life=4, tf=2.4)
c.gate_ahead(0, 2); c.one(1, 2, rps=.25); c.one(2, 2, '2', rps=.23); c.two(3); c.one(4, 1, rps=.3)
d = M('Решётка позади', 'The gate behind', 'Один привод держит решётку на втором этаже и крутит молот на четвёртом. Когда его можно останавливать?',
      'One drive holds the gate on the second floor and turns the hammer on the fourth. When is it safe to stop it?', 5, sticks=7, life=4, tf=2.1)
d.one(0, 2, rps=.24); d.gate_behind(1, 3); d.one(1, 2, '2', rps=.26); d.one(2, 2, rps=.2); d.two(4)
d.sol = [d.sol[0], [x for x in d.sol[1]], d.sol[2], d.sol[3], d.sol[4]]
e = M('Две заботы', 'Two worries', 'Приводы роняют решётки этажом выше, а палка держит всего 4 секунды. Считай, когда какую вставлять: поспешишь — сломается раньше времени.',
      'The drives drop gates one floor up, and a stick holds only 4 seconds. Work out when each one goes in: rush and it snaps too early.', 6, sticks=7, life=4, tf=1.9)
d1 = e.drv(bx(0) + 165, 2, .22); e.ham(0, 'm', 0, .2, d1); e.gate(1, '1', d1); d2 = e.drv(bx(2), 2, .25); e.ham(1, '2', 0, .2, d2); e.ham(2, '1', 0, .2, d2)
q1 = e.ham(2, '2', 2, .24); q2 = e.ham(3, 'm', 1, .3); d3 = e.drv(bx(4) + 165, 2, .23); e.ham(4, 'm', 0, .2, d3); e.gate(5, '1', d3); q3 = e.ham(5, '2', 2, .26)
e.sol = [[d1], [d2], [d2, q1], [q2], [d3], [q3]]
chapter('Решётка', 'The gate', '#aeb6c8', [a, b, c, d, e])

# ---------------- 4. Разные палки (рука из двух) ----------------
a = Raw('Две палки в руке', """  { name:{ru:'Две палки в руке', en:'Two sticks in hand'}, sticks:3, queue:['S','L','S'], par:2, solution:[0,1],
    tip:{ru:'В руке две палки: тонкая держит 3 секунды, толстая — 10. Тапни по палкам внизу — выберешь другую. Дырки приходят по очереди: какую палку вставить первой?',
         en:'You hold two sticks: the thin one holds 3 seconds, the thick one 10. Tap the sticks below to pick the other. The holes arrive in turn: which stick goes in first?'},
    wheels:[ {x:260,y:320,r:56,holes:1,rps:.125,ham:260}, {x:640,y:320,r:56,holes:1,rps:.125,ham:640,sync:[0,4]} ] },""")
b = M('Толстую — на привод', 'The thick one for the drive', 'Один привод крутит молоты на всех трёх этажах. Тонкая палка держит 3 секунды — мышонок столько не пролезет. Какой палкой клинить привод?',
      'One drive turns the hammers of all three floors. A thin stick holds 3 seconds — not enough for the whole climb. Which stick jams the drive?', 3, queue=['S', 'L', 'S', 'S'])
b.shared(0, 3, ['m', '1', '1']); b.one(1, 2, '2'); b.one(2, 2, '2')
c = M('Кому толстую?', 'Who gets the thick one?', 'Смотри на очередь палок: толстая одна. Тонкая — туда, где мышонок пробежит сразу; толстая — приводу, который держит три этажа.',
      'Watch the stick queue: there is only one thick stick. The thin one goes where the mouse passes at once; the thick one to the drive that holds three floors.', 5, queue=['S', 'S', 'S', 'L', 'S', 'S', 'S'], tf=2.3)
c.two(0); c.shared(1, 3, ['m', '1', '1']); c.one(2, 2, '2'); c.one(3, 2, '2'); c.one(4, 1, rps=.28)
d = M('Короткая — тоже хорошо', 'Short is good too', 'Первый привод роняет решётку этажом выше: чем дольше держит палка, тем дольше решётка закрыта — а кот не ждёт. Длинному приводу выше нужна толстая.',
      'The first drive drops the gate one floor up: the longer the stick holds, the longer the gate stays shut — and the cat will not wait. The long drive above needs the thick one.', 5, queue=['L', 'S', 'S', 'S', 'S', 'S'], tf=2.0)
d.gate_ahead(0, 1); d.one(1, 2, '2'); d.shared(2, 3, ['m', '1', '1']); d.one(3, 2, '2'); d.one(4, 2, '2')
e = M('Две толстые на всю башню', 'Two thick ones for the whole tower', 'Шесть этажей, два длинных привода и ровно две толстые палки. Лишних палок нет — думай, какая кому.',
      'Six floors, two long drives and exactly two thick sticks. No spare sticks — think about which goes where.', 6, queue=['S', 'L', 'S', 'S', 'L', 'S'], tf=1.8)
e.shared(0, 3, ['m', '1', '1']); e.one(1, 2, '2'); e.one(2, 2, '2'); e.shared(3, 3, ['m', '1', '1']); e.one(4, 2, '2'); e.one(5, 2, '2')
chapter('Разные палки', 'Different sticks', '#4fd1c5', [a, b, c, d, e])

# ---------------- 5. Гонка (мастерская 1) ----------------
a = M('Разминка', 'Warm-up', 'Новых правил нет — только всё, что уже знаешь, подряд. Палка держит 4 секунды.',
      'No new rules — just everything you already know, in a row. A stick holds 4 seconds.', 5, sticks=7, life=4, tf=2.2)
a.one(0); a.two(1); a.shared(2, 2); a.two(4, 2, 1)
b = M('Ремни и решётка', 'Belts and a gate', 'Привод внизу держит решётку на четвёртом этаже. Между ними — общий привод. Запасная палка одна.',
      'The drive at the bottom holds a gate on the fourth floor. Between them is a shared drive. One spare stick.', 5, sticks=7, life=4, tf=2.0)
b.gate_ahead(0, 3); b.shared(1, 2, ['m', '1']); b.one(2, 2, '2'); b.one(3, 2, '2'); b.two(4)
c = M('Толстая одна', 'Only one thick', 'Длинный привод, пара молотов и колесо с одной дыркой наверху. Толстая палка одна — не отдай её не тому.',
      'A long drive, a pair of hammers and a single-hole wheel at the top. Only one thick stick — do not give it to the wrong wheel.', 5, tf=1.9)
c.one(0); c.shared(1, 3, ['m', '1', '1']); c.one(2, 2, '2'); c.one(3, 2, '2'); c.one(4, 1, rps=.26); c.autoq(1)
d = M('Бегом через решётки', 'Running through the gates', 'Две решётки и кот. Толстая палка на приводе решётки — это десять секунд на лестнице. Кому её отдать?',
      'Two gates and the cat. A thick stick on a gate drive means ten seconds stuck on a ladder. Who should get it?', 6, queue=['L', 'S', 'S', 'L', 'S', 'S', 'S', 'S'], tf=1.75)
d.gate_ahead(0, 1); d.one(1, 2, '2'); d.two(2); d.gate_ahead(3, 4); d.one(4, 2, '2'); d.one(5, 1, rps=.28)
e = M('Большая гонка', 'The big race', 'Семь этажей: длинный привод, решётка, пары молотов и кот. Лишних палок нет. Осмотри башню, прежде чем будить кота.',
      'Seven floors: a long drive, a gate, pairs of hammers and the cat. No spare sticks. Look the tower over before you wake the cat.', 7, tf=1.6)
e.two(0); e.shared(1, 3, ['m', '1', '1']); e.one(2, 2, '2'); e.one(3, 2, '2'); e.gate_ahead(4, 5); e.one(5, 2, '2'); e.two(6); e.autoq(0)
chapter('Гонка', 'The race', '#6ab7ff', [a, b, c, d, e])

# ---------------- 6. Узкая дырка ----------------
a = M('Узкая дырка', 'Narrow hole', 'В синюю дырку лезет только тонкая палка. В руке две разные — тапни по ним и выбери нужную.',
      'Only a thin stick fits a blue hole. You hold two different sticks — tap them and pick the right one.', 1, life=4)
a.two(0, t=('S', 'N'), kw1=N); a.autoq(1)
b = M('Тонкая — в узкую', 'Thin for the narrow', 'Узких дырок три, тонких палок — тоже три. Обычная держит 4 секунды и в узкую не лезет.',
      'Three narrow holes and three thin sticks. A normal stick holds 4 seconds and does not fit a narrow hole.', 3, life=4)
b.one(0, **N); b.two(1, t=('N', 'S'), kw2=N); b.one(2, **N); b.autoq(1, 'N')
c = M('Тонких мало', 'Thin ones are scarce', 'Тонкие палки нужны узким дыркам, а длинному приводу — толстая. Посмотри на всю очередь, прежде чем будить кота.',
      'Thin sticks are for the narrow holes, and the long drive needs the thick one. Look at the whole queue before you wake the cat.', 5, life=4, tf=2.3)
c.one(0, **N); c.shared(1, 3, ['m', '1', '1']); c.one(2, 2, '2', **N); c.one(3, 2, '2', t='N'); c.one(4, 1, rps=.28, **N); c.autoq(1, 'N')
d = M('Узкая за решёткой', 'Narrow behind the gate', 'Привод внизу держит решётку этажом выше. Тонкие палки береги для узких дырок: приводу хватит обычной.',
      'The drive at the bottom holds the gate one floor up. Save thin sticks for the narrow holes: a normal one will do for the drive.', 5, life=4, tf=2.0)
d.gate_ahead(0, 1, t='N'); d.one(1, 2, '2', **N); d.two(2, t=('S', 'N'), kw1=N); d.shared(3, 2, ['m', '1']); d.one(4, 2, '2', **N); d.autoq(1)
e = M('Узкий экзамен', 'The narrow exam', 'Шесть этажей и кот. Тонких палок ровно столько, сколько узких дырок. Сначала распредели палки в уме.',
      'Six floors and the cat. Exactly as many thin sticks as narrow holes. Assign the sticks in your head first.', 6, life=4, tf=1.8)
e.two(0, kw1=N, kw2=N); e.shared(1, 3, ['m', '1', '1']); e.one(2, 2, '2', **N); e.one(3, 2, '2', t='N'); e.gate_ahead(4, 5, t='N'); e.one(5, 2, '2', **N); e.autoq(0)
chapter('Узкая дырка', 'Narrow hole', '#7fc8ff', [a, b, c, d, e])

# ---------------- 7. Заслонка ----------------
a = M('Заслонка', 'The shutter', 'Правое колесо закрыто заслонкой, пока крутится левое: к нему идёт розовая цепь. Сначала останови ключ — потом замок.',
      'The right wheel is shuttered while the left one spins: a pink chain leads to it. Stop the key first — then the lock.', 1, queue=['S'] * 4)
k = a.one(0, 2, '1'); a.lock(0, '2', k)
b = M('Сначала ключ', 'Key first', 'Замок открыт, только пока стоит колесо-ключ. На втором этаже ключ и замок рядом. Палка держит 3 секунды.',
      'A lock is open only while its key wheel stands still. On the second floor the key and the lock sit side by side. A stick holds 3 seconds.', 3, queue=['S'] * 5)
b.one(0); k = b.one(1, 2, '1'); b.lock(1, '2', k); b.one(2)
c = M('Ключ этажом ниже', 'The key one floor down', 'Ключ от заслонки — молот этажом ниже. Его палка должна ещё держать, когда мышонок долезет до замка. Обычная палка — 4 секунды.',
      'The key to the shutter is the hammer one floor down. Its stick must still hold when the mouse reaches the lock. A normal stick lasts 4 seconds.', 5, life=4, tf=2.3)
c.one(0); k = c.one(1, t='N'); c.lock(2, 'm', k); c.two(3); k = c.one(4, 2, '1'); c.lock(4, '2', k); c.autoq(1)
d = M('Ключ держит решётку', 'The key holds the gate', 'Ключ от заслонки — привод, который держит решётку этажом выше. Остановишь его — решётка упадёт. Какой палкой его клинить? И куда девать толстую?',
      'The key to the shutter is the drive that holds the gate one floor up. Stop it and the gate drops. Which stick should jam it? And where does the thick one go?', 5, life=4, queue=['S', 'L', 'S', 'S', 'S', 'N', 'S'], tf=2.0)
d.one(0); g = d.drv(bx(1) + 165, 2, .24); d.gate(2, '1', g); d.lock(1, 'm', g); d.one(2, 2, '2'); d.shared(3, 2, ['m', '1']); d.one(4, 2, '2')
e = M('Замки и кот', 'Locks and the cat', 'Два замка, решётка и кот. Палка-ключ должна дожить до замка, а палка у решётки — не сломаться раньше времени.',
      'Two locks, a gate and the cat. The key stick must last until the lock, and the stick by the gate must not snap too early.', 6, life=4, tf=1.8)
e.one(0, **N); k = e.one(1, t='N'); e.lock(2, 'm', k); g = e.gate_ahead(3, 4); e.lock(4, '2', g, t='N'); e.two(5); e.autoq(0)
chapter('Заслонка', 'The shutter', '#ff7eb6', [a, b, c, d, e])

# ---------------- 8. Мастерская 2 ----------------
a = M('Всё по порядку', 'Everything in order', 'Мастерская: новых правил нет. Длинный привод, узкая дырка и кот.',
      'Workshop: no new rules. A long drive, a narrow hole and the cat.', 5, life=4, tf=2.1)
a.two(0); a.shared(1, 3, ['m', '1', '1']); a.one(2, 2, '2', **N); a.one(3, 2, '2'); a.one(4, 1, rps=.26); a.autoq(1)
b = M('Ключ и решётка', 'Key and gate', 'Решётка на третьем этаже, замок там же, узкая дырка у сыра. И кот.',
      'A gate on the third floor, a lock there too, a narrow hole near the cheese. And the cat.', 5, life=4, tf=1.9)
b.gate_ahead(0, 2, t='N'); k = b.one(1, t='N'); b.lock(2, '2', k); b.shared(3, 2, ['m', '1'], t='L'); b.one(4, 2, '2', **N); b.autoq(1)
c = M('Два привода и замок', 'Two drives and a lock', 'Два общих привода, между ними замок. Палки: тонкие, обычные и одна толстая — кому?',
      'Two shared drives with a lock between them. Sticks: thin, normal and one thick — who gets it?', 6, life=4, tf=1.8)
c.shared(0, 2, ['m', '1']); c.one(1, 2, '2'); k = c.one(2, t='N'); c.lock(3, '1', k); c.one(3, 2, '2', **N); c.shared(4, 2, ['m', '1'], t='L'); c.one(5, 1, '2', rps=.2); c.autoq(1)
d = M('Тесная очередь', 'A tight queue', 'Лишних палок нет. Узкие дырки, решётка и длинный привод.',
      'No spare sticks. Narrow holes, a gate and a long drive.', 6, life=4, tf=1.7)
d.one(0, **N); d.gate_ahead(1, 2, t='N'); d.one(2, 2, '2', **N); d.shared(3, 3, ['m', '1', '1']); d.one(4, 2, '2', t='N'); d.one(5, 2, '2', **N); d.autoq(0)
e = M('Экзамен мастерской', 'Workshop exam', 'Семь этажей, всё сразу: замок с ключом этажом ниже, длинный привод, узкие дырки, решётка и кот.',
      'Seven floors, everything at once: a lock with its key one floor down, a long drive, narrow holes, a gate and the cat.', 7, life=4, tf=1.55)
e.two(0, kw2=N); k = e.one(1, t='N'); e.lock(2, 'm', k); e.shared(3, 3, ['m', '1', '1']); e.one(4, 2, '2', **N); e.one(5, 2, '2'); e.gate_ahead(5, 6, slot='1') if False else None; e.one(6, 1, rps=.26, **N); e.autoq(1)
chapter('Мастерская', 'The workshop', '#b8e986', [a, b, c, d, e])

# ================= главы 9–20 =================
def units(m, seq, dial=False):
    """Башня из готовых кусков: каждый кусок занимает 1–3 этажа."""
    k = 0
    for name in seq:
        if name == 'one': m.one(k); k += 1
        elif name == 'one1': m.one(k, 1, rps=.26); k += 1
        elif name == 'oneN': m.one(k, **N); k += 1
        elif name == 'two': m.two(k); k += 1
        elif name == 'twoN': m.two(k, kw2=N); k += 1
        elif name == 'sh2': m.shared(k, 2, ['m', '1']); m.one(k + 1, 2, '2'); k += 2
        elif name == 'sh3': m.shared(k, 3, ['m', '1', '1']); m.one(k + 1, 2, '2'); m.one(k + 2, 2, '2', **N); k += 3
        elif name == 'gate': m.gate_ahead(k, k + 1, t='N'); m.one(k + 1, 2, '2'); k += 2
        elif name == 'lock': key = m.one(k, t='N'); m.lock(k + 1, 'm', key); k += 2
        elif name == 'gears': m.gears(k); k += 1
        elif name == 'gearsG': m.gears(k, gate_at=k + 1); m.one(k + 1, 2, '2'); k += 2
        elif name == 'dbl': m.double(k); k += 1
        elif name == 'sync': m.syncpair(k, d=3, rps=.125) if dial else m.syncpair(k); k += 1
        elif name == 'syncB': m.syncpair(k, d=5, rps=.125, who='b'); k += 1
        elif name == 'comp': m.composite(k, 5); k += 1
        else: raise ValueError(name)
    assert k == m.n, (m.ru, k, m.n)
    return m
def mix(ru, en, tru, ten, n, seq, tf, spare=1, dial=False, through=(), life=4, extra=''):
    m = M(ru, en, tru, ten, n, life=life, tf=tf, dial=dial, through=through, extra=extra); units(m, seq, dial); m.autoq(spare); return m

# ---------------- 9. Шестерни ----------------
a = M('Шестерни', 'Gears', 'Это шестерни: зубья сцеплены. Заклинишь правую — встанет и левая, которая её крутит. Одна палка на два молота.',
      'These are gears: their teeth mesh. Jam the right one and the left one that drives it stops too. One stick for two hammers.', 1, sticks=3)
a.gears(0)
b = M('Шестерня и решётка', 'Gear and gate', 'Левая шестерня держит ещё и решётку этажом выше. Заклинишь правую — встанут обе, и решётка упадёт. Палка держит 4 секунды: подожди её.',
      'The left gear also holds the gate one floor up. Jam the right one and both stop — and the gate drops. A stick holds 4 seconds: wait it out.', 2, sticks=3, life=4)
b.gears(0, gate_at=1); b.one(1, 2, '2')
c = mix('Зубья и ремни', 'Teeth and belts', 'Шестерни дают два молота за одну палку, общий привод — два этажа за одну. И кот.',
        'Gears give two hammers for one stick, a shared drive gives two floors for one. And the cat.', 5, ['one', 'gears', 'sh2', 'two'], 2.3)
d = mix('Шестерня роняет решётку', 'The gear drops the gate', 'Шестерни внизу держат решётку этажом выше. Чем короче палка на них, тем скорее решётка поднимется.',
        'The gears at the bottom hold the gate one floor up. The shorter the stick on them, the sooner the gate lifts.', 5, ['gearsG', 'oneN', 'gears', 'two'], 2.0)
e = mix('Экзамен шестерён', 'Gear exam', 'Шесть этажей: шестерни, длинный привод, узкая дырка и решётка под самым сыром. Лишних палок нет.',
        'Six floors: gears, a long drive, a narrow hole and a gate right under the cheese. No spare sticks.', 6, ['gears', 'sh3', 'gearsG'], 1.8, spare=0)
chapter('Шестерни', 'Gears', '#ff9a3c', [a, b, c, d, e])

# ---------------- 10. Двойное колесо ----------------
a = M('Двойное колесо', 'Double wheel', 'Тут два диска крутятся навстречу. Палка пройдёт, только когда ОБЕ дырки сойдутся под стрелкой — жди зелёную.',
      'Two discs spin against each other. The stick goes in only when BOTH holes meet under the arrow — wait for green.', 1, sticks=3)
a.double(0)
b = M('Сначала редкое', 'Rare one first', 'Дырки двойного колеса сходятся редко. Сначала поймай его — соседний молот успеешь потом. Палка держит 4 секунды.',
      'The holes of the double wheel meet rarely. Catch it first — the hammer next to it can wait. A stick holds 4 seconds.', 3, sticks=5, life=4)
b.one(0); b.double(1, 'a'); b.one(1, 2, 'b'); b.one(2)
c = mix('Двойное и привод', 'Double and drive', 'Двойное колесо на втором этаже: пока ждёшь его дырки, нижние палки ломаются. Не начинай раньше времени.',
        'A double wheel on the second floor: while you wait for its holes the sticks below snap. Do not start too early.', 5, ['one', 'dbl', 'sh2', 'two'], 2.4)
d = mix('Двойное за решёткой', 'Double behind the gate', 'Привод внизу роняет решётку, а за ней — двойное колесо. Поймай момент, когда решётка уже поднялась, а дырки ещё сошлись.',
        'The drive below drops the gate, and behind it sits a double wheel. Catch the moment when the gate is up and the holes still meet.', 5, ['gate', 'dbl', 'gears', 'one1'], 2.1)
e = mix('Экзамен двойных', 'Double exam', 'Два двойных колеса, длинный привод и узкая дырка. Лишних палок нет.',
        'Two double wheels, a long drive and a narrow hole. No spare sticks.', 6, ['two', 'dbl', 'sh3', 'dbl'], 1.9, spare=0)
chapter('Двойное колесо', 'Double wheel', '#4fd1c5', [a, b, c, d, e])

# ---------------- 11. Мастерская 2 ----------------
chapter('Мастерская 2', 'Workshop 2', '#b8e986', [
    mix('Шестерни и двойное', 'Gears and a double', 'Мастерская: всё знакомое подряд. Шестерни, узкая дырка, общий привод, двойное колесо.', 'Workshop: everything familiar in a row. Gears, a narrow hole, a shared drive, a double wheel.', 5, ['gears', 'oneN', 'sh2', 'dbl'], 2.0),
    mix('Решётка, замок, шестерни', 'Gate, lock, gears', 'Решётка этажом выше привода, потом замок с ключом этажом ниже, наверху шестерни.', 'A gate one floor above its drive, then a lock with its key one floor down, gears at the top.', 5, ['gate', 'lock', 'gears'], 1.9),
    mix('Двойное под длинным приводом', 'Double under a long drive', 'Двойное колесо внизу, длинный привод на три этажа, шестерни роняют решётку у сыра.', 'A double wheel at the bottom, a long drive over three floors, gears drop the gate near the cheese.', 6, ['dbl', 'sh3', 'gearsG'], 1.8),
    mix('Ключ под шестернями', 'The key under the gears', 'Одна запасная палка. Узкая дырка, шестерни, замок и общий привод.', 'One spare stick. A narrow hole, gears, a lock and a shared drive.', 6, ['twoN', 'gears', 'lock', 'sh2'], 1.7),
    mix('Экзамен мастерской 2', 'Workshop 2 exam', 'Семь этажей: шестерни, двойное колесо, длинный привод и решётка. Лишних палок нет.', 'Seven floors: gears, a double wheel, a long drive and a gate. No spare sticks.', 7, ['gears', 'dbl', 'sh3', 'gate'], 1.55, spare=0)])

# ---------------- 12. Жертва ----------------
a = M('Подожди!', 'Wait for me!', 'Дырки приходят по очереди, а палка держит всего 3 секунды — оба молота сразу не поймать. Заклиненное колесо потом ОТСТАЁТ: заклинь одно просто так — пусть подождёт.',
      'The holes arrive in turn and a stick holds only 3 seconds — you cannot catch both hammers. A jammed wheel then FALLS BEHIND: jam one for nothing — let it wait.', 1, queue=['S'] * 4)
a.syncpair(0)
b = M('Кто-то должен ждать', 'Someone has to wait', 'Наверху два колеса идут врозь. Одна палка — чтобы колесо подождало, ещё две — на оба молота.',
      'Upstairs two wheels are out of step. One stick makes a wheel wait, two more stop both hammers.', 2, queue=['S'] * 5)
b.one(0); b.syncpair(1)
c = mix('Жертва на втором этаже', 'A sacrifice on floor two', 'Колёса на втором этаже идут врозь: одно придётся придержать. Обычная палка держит 4 секунды, тонкая — 3.',
        'The wheels on the second floor are out of step: one must be held back. A normal stick holds 4 seconds, a thin one 3.', 5, ['one', 'sync', 'sh2', 'two'], 2.6)
d = mix('Две жертвы', 'Two sacrifices', 'Две пары колёс идут врозь, между ними решётка. На каждую пару — три тонкие палки.',
        'Two pairs of wheels are out of step, with a gate between them. Each pair takes three thin sticks.', 5, ['sync', 'gate', 'sync', 'oneN'], 2.3)
e = mix('Экзамен жертвы', 'Sacrifice exam', 'Шесть этажей: пара молотов, жертва, длинный привод и ещё одна жертва под сыром. Лишних палок нет.',
        'Six floors: a pair of hammers, a sacrifice, a long drive and one more sacrifice under the cheese. No spare sticks.', 6, ['two', 'sync', 'sh3', 'sync'], 2.0, spare=0)
chapter('Жертва', 'Sacrifice', '#c9e265', [a, b, c, d, e])

# ---------------- 13. Циферблат ----------------
a = M('Циферблат', 'The dial', 'Число у белого зубчика — через сколько секунд дырка будет под стрелкой. Тонкая палка держит 3 секунды: на столько колесо и отстанет. Посчитай!',
      'The number at the white tooth is how many seconds until the hole is under the arrow. A thin stick holds 3 seconds: the wheel falls behind by exactly that. Count!', 1, queue=['S'] * 4, dial=True)
a.syncpair(0, d=3, rps=.125)
b = M('Кто подождёт?', 'Who waits?', 'Правое колесо опаздывает на 5 секунд, круг — 8. Какое из двух придержать на 3, чтобы они сошлись?',
      'The right wheel is 5 seconds late, a full turn is 8. Which of the two should be held for 3 so that they meet?', 2, queue=['S'] * 5, dial=True)
b.syncpair(0, d=5, rps=.125, who='b'); b.one(1)
c = mix('Считай секунды', 'Count the seconds', 'Две пары с циферблатами: в одной ждёт левое колесо, в другой — правое. Смотри на числа.',
        'Two pairs with dials: in one the left wheel waits, in the other the right one. Watch the numbers.', 5, ['one', 'sync', 'sh2', 'syncB'], 2.6, dial=True)
d = mix('Циферблаты и шестерни', 'Dials and gears', 'Пара с циферблатами внизу, шестерни, узкая дырка и ещё одна пара наверху.',
        'A dial pair at the bottom, gears, a narrow hole and one more pair at the top.', 5, ['syncB', 'gears', 'oneN', 'sync', 'two'], 2.3, dial=True)
e = mix('Экзамен циферблатов', 'Dial exam', 'Шесть этажей и две пары с циферблатами. Лишних палок нет: считай, прежде чем тыкать.',
        'Six floors and two dial pairs. No spare sticks: count before you tap.', 6, ['sync', 'sh3', 'syncB', 'one1'], 2.1, spare=0, dial=True)
chapter('Циферблат', 'The dial', '#f4a261', [a, b, c, d, e])

# ---------------- 14. Мастерская 3 ----------------
chapter('Мастерская 3', 'Workshop 3', '#b8e986', [
    mix('Жертва и привод', 'Sacrifice and drive', 'Мастерская: пара с циферблатами, общий привод, пара молотов и колесо с одной дыркой.', 'Workshop: a dial pair, a shared drive, a pair of hammers and a single-hole wheel.', 5, ['sync', 'sh2', 'two', 'one1'], 2.2, dial=True),
    mix('Решётка и счёт', 'Gate and counting', 'Решётка, пара с циферблатами, шестерни и узкая дырка.', 'A gate, a dial pair, gears and a narrow hole.', 5, ['gate', 'syncB', 'gears', 'oneN'], 2.0, dial=True),
    mix('Длинный привод и жертва', 'Long drive and sacrifice', 'Пара молотов, жертва, длинный привод и двойное колесо под сыром.', 'A pair of hammers, a sacrifice, a long drive and a double wheel under the cheese.', 6, ['two', 'sync', 'sh3', 'dbl'], 1.9, dial=True),
    mix('Замок между жертвами', 'A lock between sacrifices', 'Лишних палок нет. Две пары с циферблатами, между ними замок и шестерни с решёткой.', 'No spare sticks. Two dial pairs with a lock and gate-dropping gears between them.', 6, ['sync', 'lock', 'gearsG', 'syncB'], 1.8, spare=0, dial=True),
    mix('Экзамен мастерской 3', 'Workshop 3 exam', 'Семь этажей: узкая дырка, длинный привод, жертва и решётка. Лишних палок нет.', 'Seven floors: a narrow hole, a long drive, a sacrifice and a gate. No spare sticks.', 7, ['twoN', 'sh3', 'sync', 'gate'], 1.6, spare=0, dial=True)])

# ---------------- 15. Без передышки (проходные лестницы) ----------------
a = M('Проходная лестница', 'No place to hide', 'Оранжевая лестница — проходная: на ней не спрятаться. Мышонок побежит, только когда молоты стоят на ОБОИХ этажах, и пробежит их разом.',
      'An orange ladder is a pass-through: no hiding on it. The mouse runs only when the hammers on BOTH floors stand still, and crosses them in one go.', 2, sticks=4, life=4, through=[0])
a.one(0); a.one(1)
b = M('Два этажа разом', 'Two floors in one go', 'Второй и третий этаж — без передышки: три молота должны стоять сразу. Палка держит 4 секунды.',
      'Floors two and three come without a break: three hammers must stand still at once. A stick holds 4 seconds.', 3, sticks=5, life=4, through=[1])
b.one(0); b.two(1); b.one(2)
c = mix('Привод без передышки', 'A drive with no break', 'Общий привод держит два этажа, а лестница между ними проходная — и свой молот наверху надо поймать в тот же заход.',
        'A shared drive holds two floors, and the ladder between them is a pass-through — the upper floor hammer must be caught in the same run.', 5, ['one', 'sh2', 'two', 'one1'], 2.3, through=[1])
d = mix('Две проходные', 'Two pass-throughs', 'Две проходные лестницы: внизу и под сыром. Тонкая палка на верхнем этаже должна дожить до конца забега.',
        'Two pass-through ladders: at the bottom and under the cheese. The thin stick on the upper floor must last the whole run.', 5, ['one', 'two', 'gears', 'oneN', 'one'], 2.0, through=[0, 3])
e = mix('Экзамен без передышки', 'No-break exam', 'Шесть этажей, две проходные лестницы, длинный привод и шестерни. Лишних палок нет.',
        'Six floors, two pass-through ladders, a long drive and gears. No spare sticks.', 6, ['two', 'one', 'sh3', 'gears'], 1.8, spare=0, through=[0, 4])
chapter('Без передышки', 'No break', '#ff8a5c', [a, b, c, d, e])

# ---------------- 16. Составное колесо ----------------
a = M('Составное колесо', 'Split wheel', 'Медный диск внутри колеса крутит колесо справа — медным ремнём. Зубчики белый и медный не сходятся. Заклинь правое колесо на 3 секунды — диск отстанет ровно на 3.',
      'The copper disc inside the wheel is driven by the wheel on the right — through the copper belt. The white and copper teeth never meet. Jam the right wheel for 3 seconds — the disc falls behind by exactly 3.', 1, queue=['S'] * 3, dial=True)
a.composite(0, 5)
b = M('Диск и молот', 'Disc and hammer', 'Сначала сведи диск с кругом, потом жди, когда обе дырки придут под стрелку. Наверху — обычный молот.',
      'First bring the disc and the ring together, then wait until both holes come under the arrow. Upstairs is a plain hammer.', 2, queue=['S'] * 4, dial=True)
b.composite(0, 5); b.one(1)
c = mix('Составное на втором этаже', 'Split wheel on floor two', 'Составное колесо на втором этаже: пока сводишь диск, нижняя палка сломается. Сначала почини — потом буди кота.',
        'A split wheel on the second floor: while you fix the disc the stick below will snap. Fix it first — then wake the cat.', 5, ['one', 'comp', 'sh2', 'two'], 2.8, dial=True)
d = mix('Диск, решётка, жертва', 'Disc, gate, sacrifice', 'Составное колесо внизу, решётка, пара с циферблатами и узкая дырка под сыром.',
        'A split wheel at the bottom, a gate, a dial pair and a narrow hole under the cheese.', 5, ['comp', 'gate', 'sync', 'oneN'], 2.5, dial=True)
e = mix('Экзамен составных', 'Split-wheel exam', 'Два составных колеса и длинный привод между ними. Лишних палок нет.',
        'Two split wheels with a long drive between them. No spare sticks.', 6, ['two', 'comp', 'sh3', 'comp'], 2.2, spare=0, dial=True)
chapter('Составное колесо', 'Split wheel', '#c08bff', [a, b, c, d, e])

# ---------------- 17. Мастерская 4 ----------------
chapter('Мастерская 4', 'Workshop 4', '#b8e986', [
    mix('Диск и привод', 'Disc and drive', 'Мастерская: составное колесо, общий привод и пара молотов.', 'Workshop: a split wheel, a shared drive and a pair of hammers.', 5, ['one', 'comp', 'sh2', 'two'], 2.4, dial=True),
    mix('Счёт, решётка, диск', 'Counting, gate, disc', 'Пара с циферблатами, решётка, составное колесо и узкая дырка.', 'A dial pair, a gate, a split wheel and a narrow hole.', 5, ['sync', 'gate', 'comp', 'oneN'], 2.2, dial=True),
    mix('Проходная внизу', 'A pass-through at the bottom', 'Внизу проходная лестница: три молота разом. Выше — длинный привод, составное колесо и шестерни.', 'A pass-through ladder at the bottom: three hammers at once. Above: a long drive, a split wheel and gears.', 6, ['two', 'one', 'sh3', 'comp'], 2.0, dial=True, through=[0]),
    mix('Шестерни, диск, замок', 'Gears, disc, lock', 'Лишних палок нет. Шестерни, составное колесо, замок, жертва и колесо с одной дыркой.', 'No spare sticks. Gears, a split wheel, a lock, a sacrifice and a single-hole wheel.', 6, ['gears', 'comp', 'lock', 'sync', 'one1'], 1.9, spare=0, dial=True),
    mix('Экзамен мастерской 4', 'Workshop 4 exam', 'Семь этажей: узкая дырка, составное колесо, длинный привод и решётка. Лишних палок нет.', 'Seven floors: a narrow hole, a split wheel, a long drive and a gate. No spare sticks.', 7, ['twoN', 'comp', 'sh3', 'gate'], 1.7, spare=0, dial=True)])

# ---------------- 18. Мастерская 5 ----------------
chapter('Мастерская 5', 'Workshop 5', '#b8e986', [
    mix('Три молота разом', 'Three hammers at once', 'Внизу проходная лестница. Дальше — общий привод, жертва и шестерни.', 'A pass-through ladder at the bottom. Then a shared drive, a sacrifice and gears.', 6, ['two', 'one', 'sh2', 'sync', 'gears'], 1.9, dial=True, through=[0]),
    mix('Решётка, двойное, замок', 'Gate, double, lock', 'Решётка, двойное колесо, замок и узкая дырка под сыром.', 'A gate, a double wheel, a lock and a narrow hole under the cheese.', 6, ['gate', 'dbl', 'lock', 'twoN'], 1.8),
    mix('Жертва и проходная', 'Sacrifice and a pass-through', 'Жертва внизу, длинный привод, а под сыром — проходная лестница.', 'A sacrifice at the bottom, a long drive, and a pass-through ladder under the cheese.', 6, ['sync', 'sh3', 'one', 'one1'], 1.7, dial=True, through=[4]),
    mix('Шестерни и диск', 'Gears and a disc', 'Лишних палок нет. Шестерни, ещё шестерни с решёткой, составное колесо и общий привод.', 'No spare sticks. Gears, more gears with a gate, a split wheel and a shared drive.', 6, ['gears', 'gearsG', 'comp', 'sh2'], 1.6, spare=0, dial=True),
    mix('Экзамен мастерской 5', 'Workshop 5 exam', 'Семь этажей: узкая дырка, жертва, длинный привод и замок. Лишних палок нет.', 'Seven floors: a narrow hole, a sacrifice, a long drive and a lock. No spare sticks.', 7, ['twoN', 'sync', 'sh3', 'lock'], 1.5, spare=0, dial=True)])

# ---------------- 19. Экзамен ----------------
chapter('Экзамен', 'The exam', '#ff5d5d', [
    mix('Экзамен: приводы', 'Exam: drives', 'Проходная лестница внизу, длинный привод и решётка под сыром. Лишних палок нет.', 'A pass-through ladder at the bottom, a long drive and a gate under the cheese. No spare sticks.', 7, ['one', 'one', 'sh3', 'gate'], 1.8, spare=0, through=[0]),
    mix('Экзамен: счёт', 'Exam: counting', 'Жертва, шестерни, замок, двойное колесо и пара молотов. Лишних палок нет.', 'A sacrifice, gears, a lock, a double wheel and a pair of hammers. No spare sticks.', 6, ['sync', 'gears', 'lock', 'dbl', 'two'], 1.7, spare=0, dial=True),
    mix('Экзамен: диск', 'Exam: the disc', 'Составное колесо, длинный привод, жертва и решётка. Лишних палок нет.', 'A split wheel, a long drive, a sacrifice and a gate. No spare sticks.', 7, ['comp', 'sh3', 'sync', 'gate'], 1.7, spare=0, dial=True),
    mix('Экзамен: замки', 'Exam: locks', 'Узкая дырка, решётка, жертва и замок. Лишних палок нет.', 'A narrow hole, a gate, a sacrifice and a lock. No spare sticks.', 6, ['twoN', 'gate', 'sync', 'lock'], 1.6, spare=0, dial=True),
    mix('Большой экзамен', 'The big exam', 'Семь этажей, всё сразу: пара молотов, длинный привод, жертва, составное колесо и шестерни. Лишних палок нет.', 'Seven floors, everything at once: a pair of hammers, a long drive, a sacrifice, a split wheel and gears. No spare sticks.', 7, ['two', 'sh3', 'sync', 'comp', 'gears'], 1.45, spare=0, dial=True)])

# ---------------- 20. Запас (палки общие на все пять башен главы) ----------------
P = [M('Запас на всю главу', 'A supply for the whole chapter', 'Палки тут общие на все пять башен главы: что сэкономишь — пригодится выше. Кота нет, спешить некуда.', 'The sticks here are shared by all five towers of the chapter: what you save will be needed higher up. No cat, no hurry.', 4, life=4, extra='pool:true,'),
     M('Береги тонкие', 'Save the thin ones', 'Запас тот же. Решётка, узкая дырка и шестерни.', 'The same supply. A gate, a narrow hole and gears.', 4, life=4, extra='pool:true,'),
     M('Ключ и двойное', 'Key and double', 'Запас тот же. Пара молотов, замок и двойное колесо.', 'The same supply. A pair of hammers, a lock and a double wheel.', 4, life=4, extra='pool:true,'),
     M('Жертва из запаса', 'A sacrifice from the supply', 'Запас тот же. Пара колёс идёт врозь, выше — длинный привод.', 'The same supply. A pair of wheels out of step, a long drive above.', 4, life=4, extra='pool:true,'),
     M('Вершина', 'The summit', 'Последняя башня. Всё, что осталось в запасе, — твоё.', 'The last tower. Whatever is left in the supply is yours.', 6, life=4, extra='pool:true,')]
for m_, seq in zip(P, [['one', 'sh2', 'two'], ['gate', 'oneN', 'gears'], ['two', 'lock', 'dbl'], ['sync', 'sh3'], ['twoN', 'gate', 'sh2', 'one1']]):
    units(m_, seq); m_.autoq(0)
tailq = ['S']                                                        # одна запасная палка на всю главу
for i in range(len(P) - 1, -1, -1): tailq = P[i].queue + tailq; P[i].queue = tailq[:]
chapter('Запас', 'The supply', '#ffd166', P)
