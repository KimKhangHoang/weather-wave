/*
  File name: script.css
  Author: Kim Khang Hoang
  Date created: 10/07/2024
*/

// Capitalize the first letter of a string (for professional)
function capitalizeFirstLetter(string) {
   return string.charAt(0).toUpperCase() + string.slice(1);
}

// Run a search, unless nothing (or only spaces) has been typed
function search() {
   if (document.getElementById("location").value.trim() === "") {
      return;
   }
   removePreviousWeatherContainer();
   displayWeatherContainer();
   fetchWeather();
}

// Search on click
document.getElementById("searchWeather").addEventListener("click", search);

// Search on enter
document.getElementById("location").addEventListener("keydown", function(event) {
   if (event.key === "Enter") {
      search();
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
// This table turns each code into a description and a Font Awesome icon. A nightIcon is only given where night looks different (e.g. moon instead of sun).
const weatherCodes = {
   0: { description: "clear sky", icon: "fa-sun", nightIcon: "fa-moon" },
   1: { description: "mainly clear", icon: "fa-cloud-sun", nightIcon: "fa-cloud-moon" },
   2: { description: "partly cloudy", icon: "fa-cloud-sun", nightIcon: "fa-cloud-moon" },
   3: { description: "overcast clouds", icon: "fa-cloud" },
   45: { description: "fog", icon: "fa-smog" },
   48: { description: "freezing fog", icon: "fa-smog" },
   51: { description: "light drizzle", icon: "fa-cloud-rain" },
   53: { description: "drizzle", icon: "fa-cloud-rain" },
   55: { description: "heavy drizzle", icon: "fa-cloud-rain" },
   56: { description: "light freezing drizzle", icon: "fa-cloud-rain" },
   57: { description: "freezing drizzle", icon: "fa-cloud-rain" },
   61: { description: "light rain", icon: "fa-cloud-rain" },
   63: { description: "moderate rain", icon: "fa-cloud-rain" },
   65: { description: "heavy rain", icon: "fa-cloud-showers-heavy" },
   66: { description: "light freezing rain", icon: "fa-snowflake" },
   67: { description: "freezing rain", icon: "fa-snowflake" },
   71: { description: "light snow", icon: "fa-snowflake" },
   73: { description: "snow", icon: "fa-snowflake" },
   75: { description: "heavy snow", icon: "fa-snowflake" },
   77: { description: "snow grains", icon: "fa-snowflake" },
   80: { description: "light rain showers", icon: "fa-cloud-sun-rain", nightIcon: "fa-cloud-moon-rain" },
   81: { description: "rain showers", icon: "fa-cloud-sun-rain", nightIcon: "fa-cloud-moon-rain" },
   82: { description: "heavy rain showers", icon: "fa-cloud-showers-heavy" },
   85: { description: "light snow showers", icon: "fa-snowflake" },
   86: { description: "heavy snow showers", icon: "fa-snowflake" },
   95: { description: "thunderstorm", icon: "fa-cloud-bolt" },
   96: { description: "thunderstorm with hail", icon: "fa-cloud-bolt" },
   99: { description: "thunderstorm with heavy hail", icon: "fa-cloud-bolt" }
};

// Get weather
async function fetchWeather() {
   const location = document.getElementById("location").value.trim(); // the entered location (API handles case sensitivity)

   const spinner = document.getElementById("spinner");
   const weatherInfo = document.getElementById("weatherInfo");

   try {
      spinner.style.display = "block"; // display spinner
      weatherInfo.innerHTML = ""; // clear previous data information

      // Find the coordinates of the entered location, then ask for the weather at that point
      const place = await geocodeLocation(location);
      const apiURLWeather = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,is_day&timezone=auto`; // only ask for the values the page shows

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
      // e.g. "São Paulo, Brazil". Just the name when there is no country, or when the place is the country itself (e.g. "Vietnam", "Singapore")
      const placeName = place.country && place.country !== place.name ? `${place.name}, ${place.country}` : place.name;
      const condition = weatherCodes[current.weather_code] || { description: "unknown", icon: "fa-cloud" }; // fallback for any code not in the table
      const weatherDescription = capitalizeFirstLetter(condition.description);
      const weatherIcon = (!current.is_day && condition.nightIcon) || condition.icon; // night version where there is one, otherwise the normal icon
      const timeZone = dataWeather.utc_offset_seconds; // offset from UTC in seconds, same format OpenWeatherMap used
      const temperature = Math.round(current.temperature_2m);
      const feelsLike = Math.round(current.apparent_temperature); // accounts for wind and humidity
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

      // Display the data in HTML
      weatherInfo.innerHTML = `
         <h2>${placeName}</h2>
         <span id="weather-icon" class="fa-solid ${weatherIcon}" aria-hidden="true"></span>
         <div>${weatherDescription}</div>
         <div id="temp">${temperature}°C</div>
         <div id="feels-like">Feels like ${feelsLike}°C</div>
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
   } catch (error) {
      weatherInfo.innerHTML = error.message;
   } finally {
      spinner.style.display = "none"; // hide spinner whether the search worked or failed
   }
}