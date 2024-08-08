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

// Display a weather information container
function displayWeatherContainer() {
   document.body.insertAdjacentHTML("beforeend", 
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

// Get weather
async function fetchWeather() {
   const location = capitalizeWords(document.getElementById("location").value); // the entered location (API handles case sensitivity)
   const apiKey = "ee02041144b780c8f41041db1d2517aa"; // my API key
   const apiURLWeather = `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}&units=metric`; // construct the API URL weather with my API key and the entered location
   const apiURLForecast = `https://api.openweathermap.org/data/2.5/forecast?q=${location}&appid=${apiKey}&units=metric`; // construct the API URL with forecast my API key and the entered location

   const spinner = document.getElementById("spinner");
   const weatherInfo = document.getElementById("weatherInfo");

   try {
      spinner.style.display = "block"; // display spinner
      weatherInfo.innerHTML = ""; // clear previous data information

      // Make a GET request to the OpenWeatherMap API
      const responseWeather = await fetch(apiURLWeather); 
      const responseForecast = await fetch(apiURLForecast);

      // Throw an exception if not okay
      if (!responseWeather.ok && !responseForecast.ok) {
         throw new Error("We could not get the weather information. <br>Please check your spelling and try again.");
      }

      // Convert the response to json format
      const dataWeather = await responseWeather.json(); console.log(dataWeather);
      const dataForecast = await responseForecast.json();
      
      // Retrieve and process the data
      const weatherDescription = capitalizeFirstLetter(dataWeather.weather[0].description);
      const weatherIcon = dataWeather.weather[0].icon;
      const iconUrl = `https://openweathermap.org/img/wn/${weatherIcon}@2x.png`;
      const timeZone = dataWeather.timezone;
      const temperature = Math.round(dataWeather.main.temp);
      const feelsLike = Math.round(dataWeather.main.feels_like);
      const humidity = dataWeather.main.humidity;
      const wind = Math.round(dataWeather.wind.speed * 3.6);

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
      
      let rain;
      if (dataWeather.rain && dataWeather.rain['1h']) {
         rain = dataWeather.rain['1h']; // value where available
      } else {
         rain = 0; // default value to handle absence
      }

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