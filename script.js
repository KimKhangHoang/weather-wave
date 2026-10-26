/*
  File name: script.js
  Author: Kim Khang Hoang
  Date created: 10/07/2024
*/

// Capitalize the first letter of a string (for professional)
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Make text safe to put inside HTML, so characters like < and & show as themselves instead of being read as tags.
// Used for text from outside the app (place names, error messages), which is shown as-is and never as code.
function escapeHTML(text) {
    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

// Temperature unit currently shown: "C" or "F"
let unit = "C";

// Format a Celsius temperature in the current unit, e.g. "20°C" or "68°F".
// With showUnit = false it is just "20°", for compact places like the forecast rows.
function formatTemperature(celsius, showUnit = true) {
    const value = unit === "F" ? (celsius * 9) / 5 + 32 : celsius;
    return `${Math.round(value)}°${showUnit ? unit : ""}`; // round after converting, so °F is as accurate as °C
}

// Re-draw every temperature on the page in the current unit, using the Celsius value stored on each one.
// Temperatures marked with data-short keep their compact form.
function updateTemperatures() {
    document.querySelectorAll("[data-celsius]").forEach(function (element) {
        element.textContent = formatTemperature(Number(element.dataset.celsius), !("short" in element.dataset));
    });
}

const unitSwitch = document.getElementById("unitSwitch");

// Switch the unit, slide the highlight, colour the matching option and re-draw any temperatures already shown
function setUnit(newUnit) {
    unit = newUnit;
    unitSwitch.setAttribute("aria-checked", unit === "F"); // the switch is "on" for °F
    document.querySelectorAll(".unit-option").forEach(function (option) {
        option.classList.toggle("active", option.dataset.unit === unit);
    });
    updateTemperatures();
}

// Change the unit because the user asked to, and remember the choice in the browser for next time
function chooseUnit(newUnit) {
    setUnit(newUnit);
    try {
        localStorage.setItem("temperatureUnit", unit);
    } catch (error) {
        // storage can be blocked (e.g. private browsing), the switch still works for this visit
    }
}

// Clicking °C or °F picks that unit. Anything else (the pill's edge, or Space/Enter on the keyboard) flips it
unitSwitch.addEventListener("click", function (event) {
    const option = event.target.closest(".unit-option");
    chooseUnit(option ? option.dataset.unit : unit === "C" ? "F" : "C");
});

// Start with the unit chosen on a previous visit, if there is one
try {
    const savedUnit = localStorage.getItem("temperatureUnit");
    if (savedUnit === "C" || savedUnit === "F") {
        setUnit(savedUnit);
    }
} catch (error) {
    // storage unavailable, keep the default °C
}

// Turn on the sliding animation only after the starting position has been drawn (two frames later)
requestAnimationFrame(function () {
    requestAnimationFrame(function () {
        unitSwitch.classList.add("ready");
    });
});

// Change the background sky. The scene names match the data-sky styles in style.css, e.g. "clear-day" or "rain-night"
// When one sky replaces a different one, it fades in: a copy of the old sky is laid on top and faded out (see "Sky fade" in style.css).
// The very first sky, set when the page opens, appears straight away.
function setSky(scene) {
    const body = document.body;
    if (body.dataset.sky && body.dataset.sky !== scene) {
        body.style.setProperty("--old-sky", getComputedStyle(body).getPropertyValue("--sky"));
        body.classList.remove("sky-fading");
        void body.offsetWidth; // lets the browser notice the class was removed, so the fade restarts if the sky changes again mid-fade
        body.classList.add("sky-fading");
    }
    body.dataset.sky = scene;
}

// Until a place is searched, the visitor's own clock picks a day or night sky (daytime counted as 6am to 6pm)
function clockSky() {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 18 ? "clear-day" : "clear-night";
}

let skyFollowsClock = true; // becomes false once a search shows a place, as the sky then follows that place's weather
setSky(clockSky());

// Check the clock once a minute, so a page left open turns to night at 6pm and back to day at 6am
setInterval(function () {
    if (skyFollowsClock) {
        setSky(clockSky()); // does nothing until the hour actually crosses 6am or 6pm
    }
}, 60000);

// Run a search for the typed place, unless nothing (or only spaces) has been typed
// If a suggestion was picked (and the box not edited since), that exact place is used instead of looking the name up again
function search() {
    const location = document.getElementById("location").value.trim(); // the entered location (API handles case sensitivity)
    if (location === "") {
        return;
    }
    const picked = pickedPlace;
    closeSuggestions();
    countEvent("search");
    showWeather(async function () {
        const place = picked || (await geocodeLocation(location));
        return {
            latitude: place.latitude,
            longitude: place.longitude,
            name: placeLabel(place.name, place.admin1, place.country),
        };
    });
}

// Count a use of the app (e.g. a search) as an event in GoatCounter, so the stats show how the app is used, not just visits.
// Only the event name is sent, never what was typed or where the user is.
// Does nothing if GoatCounter hasn't loaded, e.g. when an ad blocker stops it.
function countEvent(name) {
    if (window.goatcounter && window.goatcounter.count) {
        window.goatcounter.count({ path: name, event: true });
    }
}

// Name for the card heading, e.g. "Springfield, Illinois, United States", so places with the same name can be told apart.
// The region (state, province...) and country are left out when missing or when they repeat an earlier part,
// e.g. "São Paulo, Brazil" (the state is also São Paulo) or just "Vietnam" for the country itself.
function placeLabel(name, region, country) {
    const parts = [name];
    [region, country].forEach(function (part) {
        if (part && !parts.includes(part)) {
            parts.push(part);
        }
    });
    return parts.join(", ");
}

// Run a search for the device's location, named after the town it is in (or "Your location" if that can't be found)
function searchMyLocation() {
    countEvent("use-my-location");
    document.getElementById("location").value = ""; // clear any earlier typed place, so the box doesn't contradict the card
    pickedPlace = null;
    closeSuggestions();
    showWeather(async function () {
        const position = await getDevicePosition();
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        return {
            latitude: latitude,
            longitude: longitude,
            name: await nameForPosition(latitude, longitude),
        };
    });
}

// Find the town and country for a position using OpenStreetMap's Nominatim service.
// Usage policy: https://operations.osmfoundation.org/policies/nominatim/ (light, user-triggered use only, with credit in the footer).
// The position is rounded to about 1km first, so nobody's exact location is sent. If anything fails, the card just says "Your location".
async function nameForPosition(latitude, longitude) {
    const lat = latitude.toFixed(2); // 2 decimal places is roughly 1km
    const lon = longitude.toFixed(2);

    // Reuse a name we've already looked up for this area, so we don't ask OpenStreetMap again
    const cacheKey = `${lat},${lon}`;
    const savedName = cachedPlaceName(cacheKey);
    if (savedName) {
        return savedName;
    }

    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&zoom=10&format=jsonv2&accept-language=en`,
        );
        if (!response.ok) {
            return "Your location";
        }
        const data = await response.json();
        const address = data.address || {}; // missing when the position isn't in any town (e.g. out at sea)
        const town = address.city || address.town || address.village || address.municipality || data.name; // the field used depends on the size of the place
        if (!town) {
            return "Your location";
        }
        const name = placeLabel(town, null, address.country); // town and country only, matching the names already saved in visitors' browsers
        rememberPlaceName(cacheKey, name); // only real names are saved, never a failed lookup
        return name;
    } catch (error) {
        return "Your location"; // e.g. no internet connection, or the service is unavailable
    }
}

// Place names already looked up, stored in the browser by rounded position (OpenStreetMap's policy asks apps to cache results)
function cachedPlaceName(cacheKey) {
    try {
        const cache = JSON.parse(localStorage.getItem("placeNames")) || {};
        return cache[cacheKey];
    } catch (error) {
        return undefined; // storage unavailable, so just look it up
    }
}

function rememberPlaceName(cacheKey, name) {
    try {
        let cache = JSON.parse(localStorage.getItem("placeNames")) || {};
        if (Object.keys(cache).length >= 50) {
            cache = {}; // start fresh rather than let the list grow forever
        }
        cache[cacheKey] = name;
        localStorage.setItem("placeNames", JSON.stringify(cache));
    } catch (error) {
        // storage unavailable, the name just won't be remembered
    }
}

// Ask the browser for the device's position. The browser shows its own Allow / Block prompt the first time.
// getCurrentPosition reports back through callbacks, so it is wrapped in a Promise to make it usable with await.
function getDevicePosition() {
    return new Promise(function (resolve, reject) {
        if (!navigator.geolocation) {
            reject(new Error("Your browser cannot share your location.\nPlease search for a place instead."));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            resolve, // success: hands back the position
            function (error) {
                if (error.code === error.PERMISSION_DENIED) {
                    reject(
                        new Error(
                            "Location access is blocked.\nAllow it in your browser settings, or search for a place instead.",
                        ),
                    );
                } else {
                    reject(
                        new Error("We could not find your location.\nPlease try again, or search for a place instead."),
                    );
                }
            },
            { timeout: 10000, maximumAge: 600000 }, // give up after 10 seconds, and reuse a position from the last 10 minutes
        );
    });
}

// Search on click
document.getElementById("searchWeather").addEventListener("click", search);

// Use my location on click
document.getElementById("useLocation").addEventListener("click", searchMyLocation);

// Suggestions: while typing, matching places are listed under the search box to pick from
const locationInput = document.getElementById("location");
const suggestionList = document.getElementById("suggestions");
const suggestionStatus = document.getElementById("suggestionStatus");
let suggestedPlaces = []; // the places currently listed
let activeIndex = -1; // the place highlighted with the arrow keys (-1 for none)
let pickedPlace = null; // the suggestion picked, until the box is edited again
let suggestionTimer; // waits for a pause in typing before looking places up
let latestLookup = 0; // numbers each lookup, so a slow older answer can't replace a newer one

locationInput.addEventListener("input", function () {
    pickedPlace = null; // the text no longer matches the picked place
    clearTimeout(suggestionTimer);
    const text = locationInput.value.trim();
    if (text.length < 2) {
        closeSuggestions();
        suggestedPlaces = [];
        return;
    }
    suggestionTimer = setTimeout(async function () {
        const lookup = ++latestLookup;
        let places;
        try {
            places = await findPlaces(text, 10); // more than needed, as some are left out below
        } catch (error) {
            places = []; // no list if the lookup fails, searching still works as usual
        }
        if (lookup === latestLookup) {
            // Prefer towns and regions over landmarks like parks and airports, unless landmarks are all there is (e.g. "Mount Everest")
            const towns = places.filter(isTownOrRegion);
            showSuggestions(withoutRepeats(towns.length > 0 ? towns : places).slice(0, 5));
        }
    }, 300);
});

// Whether a place is a town or suburb, a state or region, a country or an island, going by its GeoNames feature code
// (e.g. "PPL" a populated place, "ADM1" a state, "PCLI" a country, "ISL" an island). Places without a code are kept.
function isTownOrRegion(place) {
    return !place.feature_code || ["PPL", "ADM", "PCL", "ISL"].some((kind) => place.feature_code.startsWith(kind));
}

// Leave out places that would look identical in the list (same name, region and country), keeping the first, best match
function withoutRepeats(places) {
    const seen = new Set();
    return places.filter(function (place) {
        const label = [place.name, place.admin1, place.country].join("|");
        if (seen.has(label)) {
            return false;
        }
        seen.add(label);
        return true;
    });
}

// List the places under the search box. Names are added as plain text, so nothing in them can be treated as HTML
function showSuggestions(places) {
    suggestedPlaces = places;
    suggestionList.replaceChildren();
    places.forEach(function (place, i) {
        const item = document.createElement("li");
        item.className = "suggestion";
        item.dataset.index = i;
        item.id = "suggestion-" + i; // lets the search box point screen readers at the highlighted place
        item.setAttribute("role", "option");
        item.setAttribute("aria-selected", "false");
        const name = document.createElement("span");
        name.className = "suggestion-name";
        name.textContent = place.name;
        const area = document.createElement("span");
        area.className = "suggestion-area";
        area.textContent = [place.admin1, place.country].filter((part) => part && part !== place.name).join(", "); // e.g. "Illinois, United States"
        item.append(name, " ", area);
        suggestionList.append(item);
    });
    suggestionStatus.textContent =
        places.length === 0
            ? "No matching places"
            : `${places.length} ${places.length === 1 ? "place" : "places"} found`;
    if (places.length > 0) {
        openSuggestions();
    } else {
        suggestionList.hidden = true;
        locationInput.setAttribute("aria-expanded", "false");
    }
}

// Show the list with nothing highlighted yet
function openSuggestions() {
    suggestionList.hidden = false;
    locationInput.setAttribute("aria-expanded", "true");
    setActive(-1);
}

// Hide the list, and stop any lookup still waiting or on its way
function closeSuggestions() {
    clearTimeout(suggestionTimer);
    latestLookup++;
    suggestionList.hidden = true;
    locationInput.setAttribute("aria-expanded", "false");
    setActive(-1);
}

// Highlight one place in the list (-1 for none), and tell screen readers which one it is
function setActive(index) {
    activeIndex = index;
    [...suggestionList.children].forEach(function (item, i) {
        item.setAttribute("aria-selected", i === index);
    });
    if (index >= 0) {
        locationInput.setAttribute("aria-activedescendant", "suggestion-" + index);
    } else {
        locationInput.removeAttribute("aria-activedescendant");
    }
}

// Keyboard: arrows move through the list, Enter picks the highlighted place (or searches as usual), Escape closes the list
locationInput.addEventListener("keydown", function (event) {
    const open = !suggestionList.hidden;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        if (suggestedPlaces.length === 0) {
            return;
        }
        event.preventDefault(); // stop the cursor jumping to the start or end of the text
        if (!open) {
            openSuggestions();
        }
        // Step through the list and wrap around, passing through "nothing highlighted" between the last and first place
        let next = activeIndex + (event.key === "ArrowDown" ? 1 : -1);
        if (next >= suggestedPlaces.length) {
            next = -1;
        } else if (next < -1) {
            next = suggestedPlaces.length - 1;
        }
        setActive(next);
    } else if (event.key === "Enter") {
        if (open && activeIndex >= 0) {
            chooseSuggestion(suggestedPlaces[activeIndex]);
        } else {
            search();
        }
    } else if (event.key === "Escape" && open) {
        closeSuggestions();
    }
});

// Show the weather for a picked place, using its exact position
function chooseSuggestion(place) {
    locationInput.value = place.name;
    pickedPlace = place;
    search();
}

// Keep the cursor in the search box while tapping the list, then pick the tapped place
suggestionList.addEventListener("pointerdown", function (event) {
    event.preventDefault();
});
suggestionList.addEventListener("click", function (event) {
    const item = event.target.closest(".suggestion");
    if (item) {
        chooseSuggestion(suggestedPlaces[item.dataset.index]);
    }
});

// Tapping anywhere outside the search box closes the list
document.addEventListener("click", function (event) {
    if (!event.target.closest(".weather-search")) {
        closeSuggestions();
    }
});

// Display a loading spinner straight after the search bar (and above the footer), and hand it back.
// Screen readers skip it, since #weatherStatus already says the weather is loading.
function displaySpinner() {
    const searchBar = document.querySelector(".search-bar-container");
    searchBar.insertAdjacentHTML("afterend", `<div class="spinner" aria-hidden="true"></div>`);
    return searchBar.nextElementSibling; // the spinner just added
}

// Remove the previous spinner, weather card and forecast card, if there are any
function removePreviousWeatherContainer() {
    document.querySelectorAll(".spinner, .weather-info-container, .forecast-card").forEach(function (element) {
        element.remove();
    });
}

// Put content (the weather, or an error message) inside a weather card
function weatherContainerHTML(content) {
    return `
      <div class="weather-info-container">
         <div id="weatherInfo">${content}</div>
      </div>`;
}

// Find places matching a name using Open-Meteo's geocoding service (no API key needed), best match first.
// Gives back up to `count` places, each with its name, region (admin1), country, latitude and longitude, or an empty list if nothing matches.
async function findPlaces(name, count) {
    const apiURLGeocoding = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=${count}&language=en&format=json`; // encode so spaces, accents and symbols are sent safely

    const response = await fetch(apiURLGeocoding);
    if (!response.ok) {
        throw new Error("We could not get the weather information.\nPlease try again later.");
    }

    const data = await response.json();
    return data.results || []; // "results" is left out completely when no place matches
}

// Turn a place name into coordinates: the best match for the name
async function geocodeLocation(name) {
    const places = await findPlaces(name, 1);
    if (places.length === 0) {
        throw new Error("We could not get the weather information.\nPlease check your spelling and try again.");
    }
    return places[0];
}

// Open-Meteo describes the sky with a number (a WMO weather code) instead of text and an icon.
// This table turns each code into a description, a Font Awesome icon and a background sky (clear, cloudy, fog, rain, snow or storm).
// A nightIcon is only given where night looks different (e.g. moon instead of sun).
const weatherCodes = {
    0: { description: "clear sky", icon: "fa-sun", nightIcon: "fa-moon", sky: "clear" },
    1: { description: "mainly clear", icon: "fa-cloud-sun", nightIcon: "fa-cloud-moon", sky: "clear" },
    2: { description: "partly cloudy", icon: "fa-cloud-sun", nightIcon: "fa-cloud-moon", sky: "cloudy" },
    3: { description: "overcast clouds", icon: "fa-cloud", sky: "cloudy" },
    45: { description: "fog", icon: "fa-smog", sky: "fog" },
    48: { description: "freezing fog", icon: "fa-smog", sky: "fog" },
    51: { description: "light drizzle", icon: "fa-cloud-rain", sky: "rain" },
    53: { description: "drizzle", icon: "fa-cloud-rain", sky: "rain" },
    55: { description: "heavy drizzle", icon: "fa-cloud-rain", sky: "rain" },
    56: { description: "light freezing drizzle", icon: "fa-cloud-rain", sky: "rain" },
    57: { description: "freezing drizzle", icon: "fa-cloud-rain", sky: "rain" },
    61: { description: "light rain", icon: "fa-cloud-rain", sky: "rain" },
    63: { description: "moderate rain", icon: "fa-cloud-rain", sky: "rain" },
    65: { description: "heavy rain", icon: "fa-cloud-showers-heavy", sky: "rain" },
    66: { description: "light freezing rain", icon: "fa-snowflake", sky: "rain" },
    67: { description: "freezing rain", icon: "fa-snowflake", sky: "rain" },
    71: { description: "light snow", icon: "fa-snowflake", sky: "snow" },
    73: { description: "snow", icon: "fa-snowflake", sky: "snow" },
    75: { description: "heavy snow", icon: "fa-snowflake", sky: "snow" },
    77: { description: "snow grains", icon: "fa-snowflake", sky: "snow" },
    80: { description: "light rain showers", icon: "fa-cloud-sun-rain", nightIcon: "fa-cloud-moon-rain", sky: "rain" },
    81: { description: "rain showers", icon: "fa-cloud-sun-rain", nightIcon: "fa-cloud-moon-rain", sky: "rain" },
    82: { description: "heavy rain showers", icon: "fa-cloud-showers-heavy", sky: "rain" },
    85: { description: "light snow showers", icon: "fa-snowflake", sky: "snow" },
    86: { description: "heavy snow showers", icon: "fa-snowflake", sky: "snow" },
    95: { description: "thunderstorm", icon: "fa-cloud-bolt", sky: "storm" },
    96: { description: "thunderstorm with hail", icon: "fa-cloud-bolt", sky: "storm" },
    99: { description: "thunderstorm with heavy hail", icon: "fa-cloud-bolt", sky: "storm" },
};

// Show the weather card and forecast card for a place, with a spinner while waiting.
// findPlace is a function telling it where to look (typed search or device location) and returning {latitude, longitude, name}.
// If anything fails, the error message is shown in the weather card instead.
// Screen readers are told when it starts loading, then given a short summary or the error.
async function showWeather(findPlace) {
    const weatherStatus = document.querySelector("#weatherStatus");
    removePreviousWeatherContainer();
    const spinner = displaySpinner(); // this search's own spinner, so a newer search can't mix up results

    // On touch screens, close the on-screen keyboard so it doesn't cover the results.
    // Computers keep the focus in the search box, so keyboard users can carry on typing.
    if (window.matchMedia("(pointer: coarse)").matches) {
        locationInput.blur();
    }
    weatherStatus.textContent = "Loading the weather"; // also makes sure searching the same place twice is announced again

    let cardsHTML;
    let summary;
    let sky; // stays empty after a failed search, so the background doesn't change
    try {
        const place = await findPlace();
        const dataWeather = await fetchWeatherAt(place.latitude, place.longitude);
        cardsHTML = weatherContainerHTML(weatherCardHTML(place.name, dataWeather)) + forecastCardHTML(dataWeather);
        summary = `Weather for ${place.name}: ${formatTemperature(dataWeather.current.temperature_2m)}, ${conditionFor(dataWeather.current.weather_code).description}`;
        sky = skyFor(dataWeather.current);
    } catch (error) {
        cardsHTML = weatherContainerHTML(escapeHTML(error.message).replaceAll("\n", "<br>")); // a line break in a message starts a new line
        summary = error.message.replaceAll("\n", " ");
    }

    if (!spinner.isConnected) {
        return; // a newer search has replaced this one while we were waiting, so drop these results
    }
    spinner.insertAdjacentHTML("afterend", cardsHTML); // the cards take the spinner's place
    spinner.remove();
    weatherStatus.textContent = summary; // plain text, so it needs no escaping
    if (sky) {
        setSky(sky);
        skyFollowsClock = false;
    }
}

// The sky scene for the current weather at a place, e.g. "rain-night".
// The place's own day or night flag is used, rather than the visitor's clock.
function skyFor(current) {
    return `${conditionFor(current.weather_code).sky}-${current.is_day ? "day" : "night"}`;
}

// Ask Open-Meteo for the current weather, the hour-by-hour forecast and the 7-day forecast at a point, in one request.
// Only the values the page shows are requested.
// The position is rounded to about 1km first, like for place names, so nobody's exact location is sent.
// The forecast stays practically the same: at most about 0.1° different, from a slightly different ground height.
async function fetchWeatherAt(latitude, longitude) {
    const lat = latitude.toFixed(2);
    const lon = longitude.toFixed(2);
    const currentFields =
        "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,is_day";
    const hourlyFields = "temperature_2m,weather_code,precipitation_probability,is_day";
    const dailyFields = "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max";
    const apiURLWeather = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=${currentFields}&hourly=${hourlyFields}&daily=${dailyFields}&forecast_days=7&timezone=auto`; // timezone=auto makes each day run midnight to midnight at that place

    const responseWeather = await fetch(apiURLWeather);
    if (!responseWeather.ok) {
        throw new Error("We could not get the weather information.\nPlease try again later.");
    }
    return responseWeather.json();
}

// Turn Open-Meteo's answer into the HTML for the weather card
function weatherCardHTML(placeName, dataWeather) {
    const current = dataWeather.current;

    const condition = conditionFor(current.weather_code);
    const weatherDescription = capitalizeFirstLetter(condition.description);
    const weatherIcon = (!current.is_day && condition.nightIcon) || condition.icon; // night version where there is one, otherwise the normal icon
    const timeZone = dataWeather.utc_offset_seconds; // offset from UTC in seconds, same format OpenWeatherMap used
    const temperature = current.temperature_2m; // in degree Celsius, rounded when displayed
    const feelsLike = current.apparent_temperature; // accounts for wind and humidity
    const humidity = current.relative_humidity_2m;
    const wind = Math.round(current.wind_speed_10m); // already in km/h, OpenWeatherMap sent m/s

    // The place's local date and time, e.g. "Oct-25-2026" and "01:00".
    // Each part is asked for separately, because browsers join them differently (Safari writes "Oct 25, 2026 at 01:00", Chrome "Oct 25, 2026, 01:00").
    // h23 counts hours 00 to 23, so just after midnight shows "00:05" rather than "24:05".
    const parts = {};
    new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        timeZone: "UTC", // the offset is already added, so read the result as UTC
    })
        .formatToParts(new Date(Date.now() + timeZone * 1000))
        .forEach(function (part) {
            parts[part.type] = part.value;
        });
    const date = `${parts.month}-${parts.day}-${parts.year}`;
    const time = `${parts.hour}:${parts.minute}`;

    const rain = current.precipitation; // rain, showers and snow over the past hour, in mm (always present)

    return `
         <div class="card-top">
            <div id="date">${date}</div>
            <div id="time">${time}</div>
         </div>
         <h2>${escapeHTML(placeName)}</h2>
         <span id="weather-icon" class="fa-solid ${weatherIcon}" aria-hidden="true"></span>
         <div>${weatherDescription}</div>
         <div id="temp" data-celsius="${temperature}">${formatTemperature(temperature)}</div>
         <div id="feels-like">Feels like <span data-celsius="${feelsLike}">${formatTemperature(feelsLike)}</span></div>
         <div class="weather-stats">
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
         </div>
      `;
}

// Look up a weather code's description, icon and sky, with a fallback for any code not in the table
function conditionFor(code) {
    return weatherCodes[code] || { description: "unknown", icon: "fa-cloud", sky: "cloudy" };
}

// Build the forecast card: the next 24 hours at the top, then one row per day with its icon, chance of rain, and low / high temperature.
// Open-Meteo sends each value as a list with one entry per day, so entry i of each list belongs to the same day.
function forecastCardHTML(dataWeather) {
    const daily = dataWeather.daily;
    const rows = daily.time
        .map(function (day, i) {
            const condition = conditionFor(daily.weather_code[i]);
            const description = capitalizeFirstLetter(condition.description);
            const rainChance = daily.precipitation_probability_max[i]; // can be missing for some places
            const low = daily.temperature_2m_min[i];
            const high = daily.temperature_2m_max[i];
            return `
         <li class="forecast-day">
            <span class="forecast-name">${i === 0 ? "Today" : dayName(day)}</span>
            <span class="forecast-icon fa-solid ${condition.icon}" role="img" aria-label="${description}" title="${description}"></span>
            <span class="forecast-rain"><span class="fa-solid fa-droplet" aria-hidden="true"></span> ${rainChance == null ? "–" : rainChance + "%"}</span>
            <span class="forecast-temps">
               <span class="forecast-low" data-celsius="${low}" data-short>${formatTemperature(low, false)}</span> /
               <span class="forecast-high" data-celsius="${high}" data-short>${formatTemperature(high, false)}</span>
            </span>
         </li>`;
        })
        .join("");

    return `
      <section class="forecast-card">
         ${hourlyStripHTML(dataWeather.hourly, dataWeather.current.time)}
         <h3>Next 7 days</h3>
         <ol class="forecast-days">${rows}</ol>
      </section>`;
}

// Build the "Next 24 hours" strip: one item per hour, starting from the current hour, with its icon, temperature and chance of rain.
// The hourly lists start at midnight at that place, so the hours already gone are skipped.
function hourlyStripHTML(hourly, currentTime) {
    const currentHour = currentTime.slice(0, 13) + ":00"; // e.g. "2026-10-18T23:45" becomes "2026-10-18T23:00"
    const start = Math.max(hourly.time.indexOf(currentHour), 0); // start of the list if the hour can't be found
    const items = hourly.time
        .slice(start, start + 24)
        .map(function (time, n) {
            const i = start + n; // position of this hour in the full lists
            const condition = conditionFor(hourly.weather_code[i]);
            const description = capitalizeFirstLetter(condition.description);
            const icon = (!hourly.is_day[i] && condition.nightIcon) || condition.icon; // moon instead of sun after dark, like the weather card
            const temperature = hourly.temperature_2m[i];
            const rainChance = hourly.precipitation_probability[i]; // can be missing for some places
            return `
         <li class="hour">
            <span class="hour-time">${n === 0 ? "Now" : time.slice(11)}</span>
            <span class="hour-icon fa-solid ${icon}" role="img" aria-label="${description}" title="${description}"></span>
            <span class="hour-temp" data-celsius="${temperature}" data-short>${formatTemperature(temperature, false)}</span>
            <span class="hour-rain"><span class="fa-solid fa-droplet" aria-hidden="true"></span> ${rainChance == null ? "–" : rainChance + "%"}</span>
         </li>`;
        })
        .join("");

    // tabindex lets keyboard users reach the strip and scroll it with the arrow keys (Chrome allows this by itself, Safari doesn't).
    // The heading doubles as its name, so screen readers say "Next 24 hours" when it's reached.
    return `
      <h3 id="hourlyHeading">Next 24 hours</h3>
      <ol class="hourly-strip" tabindex="0" aria-labelledby="hourlyHeading">${items}</ol>`;
}

// Short weekday name for a date like "2026-10-18", e.g. "Sun".
// Read as midday UTC and named in UTC, so the visitor's own time zone can't shift it to the day before or after.
function dayName(isoDate) {
    return new Date(isoDate + "T12:00:00Z").toLocaleDateString("en-US", {
        weekday: "short",
        timeZone: "UTC",
    });
}
