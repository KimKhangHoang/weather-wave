# <img src="icons/favicon.svg" width="32" height="32" alt="" /> WeatherWave

[![Visits](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fweatherwave.goatcounter.com%2Fcounter%2FTOTAL.json&query=%24.count&label=visits&color=0062cc)](https://weatherwave.goatcounter.com)
[![Searches](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fweatherwave.goatcounter.com%2Fcounter%2Fsearch.json&query=%24.count&label=searches&color=0062cc)](https://weatherwave.goatcounter.com)
[![Location searches](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fweatherwave.goatcounter.com%2Fcounter%2Fuse-my-location.json&query=%24.count&label=location%20searches&color=0062cc)](https://weatherwave.goatcounter.com)

WeatherWave shows the current weather, the next 24 hours and the next 7 days for any place in the world.

## Live Demo

Try it at [kimkhanghoang.github.io/weather-wave](https://kimkhanghoang.github.io/weather-wave/).

## Features

- Current weather for any town, city or country: temperature, feels like, humidity, wind and precipitation
- Hour-by-hour forecast for the next 24 hours, and a 7-day forecast with chance of rain
- "Use my location" button that names the nearest town
- °C / °F switch, remembered for your next visit
- Background sky that changes with the weather and the time of day at the place you search
- Works on phones, tablets and desktops, with the weather and forecast side by side on wide screens

## Technologies Used

- HTML, CSS and JavaScript, with no frameworks or build step
- [Open-Meteo](https://open-meteo.com/) for weather data and place search (no API key required)
- [OpenStreetMap Nominatim](https://nominatim.org/) for naming your location
- [Font Awesome](https://fontawesome.com/) for icons
- [GoatCounter](https://www.goatcounter.com/) for visit counts

## Usage Stats

Visits, searches and "use my location" searches are counted with [GoatCounter](https://www.goatcounter.com/), which doesn't store IP addresses or other personal information.
For searches, only the fact that one happened is recorded, never what was typed or where the user is.
The badges above update every few hours, and the full stats are public [here](https://weatherwave.goatcounter.com).
