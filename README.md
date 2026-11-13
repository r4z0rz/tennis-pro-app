# 🎾 Tennis Pro Analytics

> Профессиональная система анализа теннисной биомеханики, тактической дисперсии ударов, перемещений по корту и телеметрии полёта мяча уровня ATP / Semi-Pro.

Разработано по рекомендациям профессионального тренера тура ATP на основе пожеланий игрока и тренера:
1. **Dual Slow-Mo & Skeleton Overlay Studio** — покадровое сравнение ударов профи (Роджер Федерер) и ученика в трёх режимах (Split 50/50, Ghost-наложение с прозрачностью, шторка Curtain), автоматическая детекция углов (локоть, колени, точка контакта Late Contact).
2. **Shot Dispersion & Zone Heatmap** — интерактивный корт Hawkeye, тепловая карта радиальной плотности KDE, фильтрация по направлениям (Forehand Crosscourt, Down-the-Line, Backhand Cross) и глубина ударов в 2-метровый коридор безопасности.
3. **Footwork & Court Movement Tracer** — схема бега в розыгрыше, расчёт эффективного пути (Path Efficiency Index), «лишние метры», индикатор тайминга сплит-степа (+135 мс) и рекавери на биссектрису.
4. **Ball Flight Telemetry & Radar** — физика полёта мяча с учётом лобового сопротивления воздуха и покрытия (Хард, Грунт, Трава), расчёт времени транзита от ракетки до ракетки соперника и бюджет окна реакции.

## 🚀 Live Demo
Приложение доступно онлайн на GitHub Pages:
👉 **[https://r4z0rz.github.io/tennis-pro-app/](https://r4z0rz.github.io/tennis-pro-app/)**

## 🤖 Multi-Agent Sync
Architecture overview, math contracts, state schemas, and synchronization ledger for collaborating AI agents: **[AGENT_SYNC.md](AGENT_SYNC.md)**.

## 💻 Локальный запуск
Приложение полностью автономно и не требует серверов или установки зависимостей:
1. Клонируйте репозиторий:
   ```bash
   git clone https://github.com/r4z0rz/tennis-pro-app.git
   ```
2. Откройте файл `index.html` в любом современном браузере.
