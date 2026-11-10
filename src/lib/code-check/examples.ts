// Short, realistic programs for the Pin check page. Each one carries the kind
// of slip the check exists to catch, so a first visit shows what it does.

export type CodeExample = {
  id: string;
  title: string;
  boardId: string;
  code: string;
};

export const codeExamples: readonly CodeExample[] = [
  {
    id: "esp32-weather",
    title: "ESP32 weather station",
    boardId: "esp32-devkitc",
    code: `#include <WiFi.h>
#include <Wire.h>

#define STATUS_LED 2
#define FAN_RELAY 34
const int LIGHT_SENSOR = 25;

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);          // BME280 on I2C
  pinMode(STATUS_LED, OUTPUT);
  pinMode(FAN_RELAY, OUTPUT);
  WiFi.begin("ssid", "password");
}

void loop() {
  int light = analogRead(LIGHT_SENSOR);
  digitalWrite(FAN_RELAY, light > 2000 ? HIGH : LOW);
  digitalWrite(STATUS_LED, HIGH);
  delay(1000);
}
`,
  },
  {
    id: "pico-plants",
    title: "Pico plant monitor",
    boardId: "raspberry-pi-pico",
    code: `from machine import Pin, ADC, I2C, PWM
import time

pump = Pin(15, Pin.OUT)
soil = ADC(Pin(26))
tank = ADC(Pin(22))
display = I2C(0, sda=Pin(4), scl=Pin(5))
buzzer = PWM(Pin(16))

while True:
    if soil.read_u16() < 20000 and tank.read_u16() > 5000:
        pump.on()
        time.sleep(2)
        pump.off()
    time.sleep(60)
`,
  },
  {
    id: "pi-doorbell",
    title: "Raspberry Pi doorbell",
    boardId: "raspberry-pi-5",
    code: `from gpiozero import Button, LED, Buzzer
from signal import pause

bell = Button(17)
porch = LED(27)
chime = Buzzer(0)

def ring():
    porch.on()
    chime.beep(on_time=0.2, off_time=0.2, n=3)

bell.when_pressed = ring
pause()
`,
  },
  {
    id: "uno-dimmer",
    title: "UNO lamp dimmer",
    boardId: "arduino-uno-rev3",
    code: `const int knob = A0;
const int lamp = 4;
const int statusLed = LED_BUILTIN;
const int debugPin = 1;

void setup() {
  pinMode(lamp, OUTPUT);
  pinMode(statusLed, OUTPUT);
  pinMode(debugPin, OUTPUT);
}

void loop() {
  int level = analogRead(knob) / 4;
  analogWrite(lamp, level);
  digitalWrite(statusLed, level > 128);
}
`,
  },
];
