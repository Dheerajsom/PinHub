# PinHub video: script and shot list

A walkthrough of PinHub for a YouTube video, about 9 minutes. Each shot gives
the exact page to open, what to do on screen, and what to say. Every number
in the narration was checked against the code on 2026-11-23; the
[fact sheet](#fact-sheet) at the end says where each one comes from and how to
re-check it before you record, because the catalog grows.

## Before you record

- **Record against production** (`https://pinhub-mauve.vercel.app`) after this
  branch is merged. Locally, without the price store's credentials, the site
  shows the bundled price snapshot and its older check date.
- Use a clean browser profile (no favorites or collections saved), dark theme,
  window about 1440 × 900, page zoom 110 % so code and pin labels read on a
  phone screen.
- For the phone shots, use the browser's device toolbar at 390 × 844.
- Close other tabs; the Tools menu and pin probe are the moments to slow down
  on.

## 0:00 — Cold open (20 s)

**Screen:** the catalog (`/`). Click the search box and type `pico sda`.

**Say:** "Wiring a board from the wrong pinout is how you lose an afternoon,
or a board. PinHub answers 'which pin is SDA on a Pico?' in about two
seconds, and shows you where that answer came from."

**Show:** the Pin lookup answer, then click its first pin. The board page opens
with that pin selected and scrolled into view.

## 0:20 — What PinHub is (40 s)

**Screen:** back to `/`. Hover the readout in the header (Boards · Interfaces ·
Sources).

**Say:** "PinHub is a catalog of 196 development boards from 38 vendors:
Raspberry Pi, Arduino, ESP32, STM32 Nucleo, Teensy, and more. Every board
links to official documentation: there are 409 source links in the catalog.
190 boards have an interactive pin map. Nothing needs an account."

**Show:** scroll the catalog list; point at a caution count on a row ("2
cautions") so viewers see warnings before they even open a board.

## 1:00 — One board page (1 min 30 s)

**Screen:** `/boards/raspberry-pi-pico`.

**Say:** "Every board has one page. The first thing you read is 'Before you
wire': the electrical cautions, and the official document to verify against.
Then the pin map."

**Do:**

1. Scroll to **Pin map**. Under **Show pins**, click **I2C**.
   **Say:** "One filter drives both halves: the table lists the pins that can
   do I2C, alternate functions included, and the drawing dims everything
   else."
2. Hover a few pads, then click **GP4**.
   **Say:** "Hover to probe a pin; click to hold it. The URL now points at
   this pin, so you can send it to someone."
3. Click **Copy table** or **CSV**.
   **Say:** "The whole pin table copies as Markdown or downloads as CSV, with
   the board and its source named in it."

## 2:30 — Board finder (1 min 30 s)

**Screen:** open **Tools** in the header.

**Say:** "Up here is Tools. Each one says what it does. Let's start with the
newest one: Board finder."

**Do:**

1. Click **Board finder**, then the example **I2C sensor + 2 analog inputs**.
   **Say:** "I tell it what my project needs: one I2C bus and two analog
   inputs. It fits on 109 of the 126 boards it can check."
2. Click **+** on SPI, then **Wireless → Wi-Fi** and **Platform →
   Microcontroller**.
   **Say:** "Add an SPI display, and say I want Wi-Fi on a microcontroller:
   37 of the 40 boards that match still fit.
   This isn't a feature checklist: buses share pins, so a board can list I2C
   and SPI and still not run both at once. PinHub actually plans the pins on
   every board, and only lists the ones where everything fits at the same
   time."
3. Point at one card's pin lines (`I2C0 · SDA … · SCL …`), then click **Open
   this plan**.
   **Say:** "Each result shows the pins it would use. Open the plan and the
   pin planner has the same assignment ready, with every caution next to the
   pin it applies to."
4. (Optional) Go to `/find?plan=i2c8.spi8.uart8`.
   **Say:** "And when nothing fits, it tells you why, board by board."

## 4:00 — Code check (1 min)

**Screen:** **Tools → Code check** (`/check`).

**Do:** click the example **ESP32 weather station**.

**Say:** "Paste a sketch and pick the board it runs on. This one has two
mistakes: a fan relay driven from GPIO34, which is input-only on an ESP32,
and a light sensor read on GPIO25, an ADC2 pin, while Wi-Fi is on. Code check
finds both, and lists anything it couldn't follow instead of pretending it
checked it. It runs entirely in your browser; your code is never uploaded."

**Show:** click **Open in planner** to show the checked pins carry over to the
pin planner.

## 5:00 — Connect two boards (45 s)

**Screen:**
`/link?a=raspberry-pi-4-model-b&b=stm32-nucleo-h753zi&bus=uart`.

**Say:** "Connecting two boards? Pick them and a bus. PinHub draws the wires
between the right pins, frames each board on the connector you're using, and
warns about logic-level mismatches and anything else in either board's
notes."

**Show:** tap a wire row; switch the bus to I2C.

## 5:45 — Compare and prices (45 s)

**Screen:** `/compare?boards=raspberry-pi-pico,esp32-devkit-v1`, then
`/prices`.

**Say:** "Compare puts boards side by side, differences first. Prices tracks
31 listings from Adafruit and the Arduino store. Each price shows when it was
actually checked; the site never makes an old check look fresh."

## 6:30 — Terminal and API (45 s)

**Screen:** a terminal.

```bash
npm install -g @dheerajsom/pinhub
```

```bash
ph rpi5
```

```bash
ph pico sda
```

```bash
curl https://pinhub-mauve.vercel.app/api/boards/raspberry-pi-5
```

**Say:** "The same catalog ships as a command-line tool, `ph`, and as a
read-only JSON API with no key."

## 7:15 — How it works (1 min 45 s)

Pick the parts that suit your audience; each is a short code shot.

1. **The data is code.** Open `src/lib/boards.ts`. "Every board is a typed
   record in one file: pins, roles, cautions, and source links. The build
   fails if a board's source links are unsafe or incomplete, or if its pin
   drawing doesn't line up with its pins." (`assertBoardSourcesValid`,
   `assertBoardVisualsValid` in `src/app/page.tsx`.)
2. **Pin functions, not guesses.** "126 boards also carry source-backed pin
   functions: which pin can be which I2C, SPI, UART, PWM or ADC channel. The
   planner is a deterministic search over those functions. If it runs out of
   steps, it says so instead of guessing." (`src/lib/pin-planner.ts`)
3. **The finder runs on the server.** "Board finder runs that same search on
   all 126 boards for every request, on the server, so the full pin maps never
   ship to your browser. The slowest request I measured took about 200
   milliseconds." (`src/lib/board-finder.ts`, `src/app/find/page.tsx`)
4. **Prices.** "A GitHub Action checks each retailer every hour, validates the
   exact product, and publishes one snapshot to Vercel Blob. The site reads
   that, and if storage is down it falls back to a dated copy in the repo."
   (`.github/workflows/update-prices.yml`, `docs/board-prices.md`)
5. **Safety in the UI.** "Cautions always come before the pin map, color only
   means something (orange is a hardware caution, cyan is what you're
   touching), and PinHub never states an electrical fact the record doesn't."
6. **Testing.** "About 2,000 unit tests, plus browser tests that run the main
   journeys at three phone sizes and in landscape, in light and dark themes,
   before anything ships."

## 9:00 — Outro (15 s)

**Say:** "PinHub is open source and MIT-licensed. If a pinout disagrees with
your hardware, every board page has a 'Report a data error' link. Thanks for
watching."

## Fact sheet

Checked on 2026-11-23 against this branch. Re-check the counts the day you
record; boards are added often.

| Claim | Value | Where it comes from |
| --- | --- | --- |
| Boards | 196 | `boards.length` in `src/lib/boards.ts`; the catalog header readout shows it live |
| Vendors | 38 | distinct `vendor` values |
| Source links | 409 | sum of `sourceLinks`; header readout |
| Interfaces | 18 | header readout |
| Boards with an interactive pin map | 190 | boards with `pinout` and an entry in `src/lib/board-visuals.ts` |
| Boards with source-backed pin functions (planner, finder) | 126 | boards with `pinFunctions` and `pinout` |
| Finder: 1× I2C + 2× ADC | fits 109 of 126 | `findBoards` |
| Finder: 1× I2C + 1× SPI + 2× ADC, microcontroller, Wi-Fi | fits 37 of 40 | `findBoards` |
| Finder: 8× I2C + 8× SPI + 8× UART | fits 0 of 126; every board gives its reason | `findBoards` |
| Price listings | 31 | `src/lib/board-prices.json` |
| Price check | hourly target (GitHub Actions at minute 17, plus a dispatch through `/api/cron/prices`) | `docs/board-prices.md` |
| Slowest finder request | ~200 ms for `i2c2.spi2.uart2.pwm4.adc4` on a laptop | measured while building the finder |
| Unit tests | 2,000+ | `npm test` |

To print every number above from the catalog as it is today:

```bash
npm run facts
```
