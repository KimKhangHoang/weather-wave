/*
  File name: script.css
  Author: Kim Khang Hoang
  Date created: 10/07/2024
*/

// Capitalize entered location (for professional)
function capitalizeWords(str) { 
   return str.split(' ').map(word => {
     return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
   }).join(' ');
}

// Capitalize the first letter of a string (for professional)
function capitalizeFirstLetter(string) {
   return string.charAt(0).toUpperCase() + string.slice(1);
}

// Search on click
document.getElementById("searchWeather").addEventListener("click", function() {
   removePreviousWeatherContainer();
   displayWeatherContainer();
   fetchWeather();
});

// Search on enter
document.getElementById("location").addEventListener("keydown", function(event) { 
   if (event.key === "Enter") {
      removePreviousWeatherContainer();
      displayWeatherContainer();
      fetchWeather();
   }
});

// Display a weather information container straight after the search bar (and above the footer)
function displayWeatherContainer() {
   document.querySelector(".search-bar-container").insertAdjacentHTML("afterend",
      `<div class="weather-info-container">
         <div class="spinner" id="spinner"></div>
         <div id="weatherInfo"></div>
      </div>`
   );
}

// Remove the previous weather information container
function removePreviousWeatherContainer() {
   const container = document.querySelector('.weather-info-container');
   if (container) {
      container.remove();
   }
}

// Turn a place name into coordinates using Open-Meteo's geocoding service (no API key needed)
async function geocodeLocation(name) {
   const apiURLGeocoding = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`; // encode so spaces, accents and symbols are sent safely

   const response = await fetch(apiURLGeocoding);
   if (!response.ok) {
      throw new Error("We could not get the weather information. <br>Please try again later.");
   }

   const data = await response.json();
   if (!data.results) {
      throw new Error("We could not get the weather information. <br>Please check your spelling and try again."); // no place matched the name
   }

   return data.results[0]; // best match, includes latitude, longitude and timezone
}

// Open-Meteo describes the sky with a number (a WMO weather code) instead of text and an icon.
// This table turns each code into a description and the matching OpenWeatherMap icon, so the page looks the same as before.
const weatherCodes = {
   0: { description: "clear sky", icon: "01" },
   1: { description: "mainly clear", icon: "02" },
   2: { description: "partly cloudy", icon: "03" },
   3: { description: "overcast clouds", icon: "04" },
   45: { description: "fog", icon: "50" },
   48: { description: "freezing fog", icon: "50" },
   51: { description: "light drizzle", icon: "09" },
   53: { description: "drizzle", icon: "09" },
   55: { description: "heavy drizzle", icon: "09" },
   56: { description: "light freezing drizzle", icon: "09" },
   57: { description: "freezing drizzle", icon: "09" },
   61: { description: "light rain", icon: "10" },
   63: { description: "moderate rain", icon: "10" },
   65: { description: "heavy rain", icon: "10" },
   66: { description: "light freezing rain", icon: "13" },
   67: { description: "freezing rain", icon: "13" },
   71: { description: "light snow", icon: "13" },
   73: { description: "snow", icon: "13" },
   75: { description: "heavy snow", icon: "13" },
   77: { description: "snow grains", icon: "13" },
   80: { description: "light rain showers", icon: "09" },
   81: { description: "rain showers", icon: "09" },
   82: { description: "heavy rain showers", icon: "09" },
   85: { description: "light snow showers", icon: "13" },
   86: { description: "heavy snow showers", icon: "13" },
   95: { description: "thunderstorm", icon: "11" },
   96: { description: "thunderstorm with hail", icon: "11" },
   99: { description: "thunderstorm with heavy hail", icon: "11" }
};

// Get weather
async function fetchWeather() {
   const location = capitalizeWords(document.getElementById("location").value); // the entered location (API handles case sensitivity)

   const spinner = document.getElementById("spinner");
   const weatherInfo = document.getElementById("weatherInfo");

   try {
      spinner.style.display = "block"; // display spinner
      weatherInfo.innerHTML = ""; // clear previous data information

      // Find the coordinates of the entered location, then ask for the weather at that point
      const place = await geocodeLocation(location);
      const apiURLWeather = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,is_day&timezone=auto`; // only ask for the values the page shows

      // Make a GET request to the Open-Meteo API
      const responseWeather = await fetch(apiURLWeather);

      // Throw an exception if not okay
      if (!responseWeather.ok) {
         throw new Error("We could not get the weather information. <br>Please try again later.");
      }

      // Convert the response to json format
      const dataWeather = await responseWeather.json();
      const current = dataWeather.current;

      // Retrieve and process the data
      const condition = weatherCodes[current.weather_code] || { description: "unknown", icon: "03" }; // fallback for any code not in the table
      const weatherDescription = capitalizeFirstLetter(condition.description);
      const weatherIcon = condition.icon + (current.is_day ? "d" : "n"); // day or night version of the icon
      const iconUrl = `https://openweathermap.org/img/wn/${weatherIcon}@2x.png`;
      const timeZone = dataWeather.utc_offset_seconds; // offset from UTC in seconds, same format OpenWeatherMap used
      const temperature = Math.round(current.temperature_2m);
      const humidity = current.relative_humidity_2m;
      const wind = Math.round(current.wind_speed_10m); // already in km/h, OpenWeatherMap sent m/s

      const dateTime = (new Date(Date.now() + (timeZone * 1000))).toLocaleDateString('en-US', {
         year: 'numeric',
         month: 'short',
         day: '2-digit',
         hour: '2-digit',
         minute: '2-digit',
         timeZone: 'UTC',
         hour12: false
      }).replace(', ', '-').replace(' ', '-');
      let [date, time] = dateTime.split(','); // split the date and time based on the comma
      if(date) date = date.trim(); // trim any whitespace from the date and time
      if(time) time = time.trim();
      
      const rain = current.precipitation; // rain, showers and snow over the past hour, in mm (always present)

      // Ensure the weather icon is fully loaded before displaying the weather info
      const img = new Image();
      img.src = iconUrl;
      img.onload = function () {
         // Display the data in HTML
         weatherInfo.innerHTML = `
            <h2>${location}</h2>
            <img id="weather-icon" alt="Weather Icon" src="${iconUrl}">
            <div>${weatherDescription}</div>
            <div id="temp">${temperature}°C</div>
            <div id="date">${date}</div>
            <div id="time">${time}</div>
            <div class="weather-block" id="humidity">
            <span class="fa-solid fa-droplet"></span>
            <p>Humidity</p>
            ${humidity}%
            </div>
            <div class="weather-block" id="wind">
            <span class="fa-solid fa-wind"></span>
            <p>Wind</p>
            ${wind}km/h
            </div>
            <div class="weather-block" id="rain">
            <span class="fa-solid fa-cloud-rain"></span>
            <p>Precipitation</p>
            ${rain}mm
            </div>
         `;
         spinner.style.display = "none"; // Hide spinner
      };
      spinner.style.display = "none"; // hide spinner when data is resolved
      
   } catch (error) {
      document.getElementById("weatherInfo").innerHTML = error.message;
      spinner.style.display = "none"; // hide spinner when data is rejected
   }
}