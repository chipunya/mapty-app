'use strict';

class Workout {
  date = new Date();
  //usually we use special libraries to create unique ids
  id = (Date.now() + '').slice(-10);
  clicks = 0;
  constructor(coords, distance, duration) {
    this.coords = coords; //[lat, lng]
    this.distance = distance; //in km
    this.duration = duration; // in min
  }
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    // prettier-ignore

    this.decription = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }
  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    //min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60); //duration is in h, we need it in min
    return this.speed;
  }
}

//////////////////////
///////APPLICATION ARCHITECTURE
//////////////////
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  //using private property instances to create our variables
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  //this method gets called immediately when new obj is created from this class
  constructor() {
    //getting users position
    this._getPosition(); //calling this method inside the constructor to get position right after the new obj is created, because constructor is called right after the obj is created

    //getting data from users local storage
    this._getLocalStorage();

    //Attaching event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    //IN EVENT LISTENERS INSIDE THE CLASSES , THIS KEYWORD POINTS TO THE DOM ELEMENT, TO WHICH THE EVENT LISTENER IS ATTACHED, NOT TO THE OBJECT, THEREFORE WE NEED TO BIND THE METHOD TO THE THIS KEYWORD SO IT POINTS TO THE OBJECT

    inputType.addEventListener('change', this._toogleElevationField);

    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }
  _getPosition() {
    if (navigator.geolocation)
      //takes two callbacks as arguments, one successCallback if coordinates are succeffully received, second errorCallback runs if there is an error

      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this), //we bind this method to this(obj on which its called)
        function () {
          alert('Could not get your position');
        }
      );
  }
  _loadMap(position) {
    // console.log(position);
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    // console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];

    // console.log(this);

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    // console.log(map);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot//{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //we use Leaflet's built it ON method instead of regular addEventListener

    //handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    //rendering markers after the map loads
    this.#workouts.forEach(workout => {
      this._renderWorkoutMarker(workout);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;

    //displaying the form
    form.classList.remove('hidden');

    //focusing the distance input so user can input distance
    inputDistance.focus();
  }

  _hideForm() {
    //clearing input fields
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => {
      form.style.display = 'grid';
    }, 1000);
  }

  _toogleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    //helper function to validate the inputs
    const validInputs = (...inputs) =>
      inputs.every(input => Number.isFinite(input));
    const allPositive = (...inputs) => inputs.every(input => input > 0);
    e.preventDefault();

    //get data from the form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // if workout is running, then create running obj
    if (type === 'running') {
      const cadence = +inputCadence.value;
      //check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');

      //creating new running obj
      workout = new Running([lat, lng], distance, duration, cadence);
    }
    // if workout is cycling, then create cycling obj
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      //check if data is valid
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');

      //creating new cycling obj
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // adding the new objs to the workout array
    this.#workouts.push(workout);
    // console.log(this.#workouts);

    //rendering workouts on map as markers
    this._renderWorkoutMarker(workout);

    //render the workouts on the list
    this._renderWorkout(workout);

    //hide the form and clear the input fields
    this._hideForm();

    //set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    //displaying the marker
    // console.log(this.#mapEvent);

    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.name === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.decription}`
      )
      .openPopup();
  }
  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <h2 class="workout__title">${workout.decription}</h2>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.name === 'running' ? '🏃‍♂️' : '🚴‍♀️'
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>
    `;
    if (workout.type === 'running')
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>
    </li>
      `;

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
        `;
    //adding new HTML as a sibling element of form at the end of form
    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    // console.log(workoutEl);
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    // console.log(workout);

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    //using th epublic interface
    // workout.click();
  }
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    // console.log(data);
    if (!data) return;

    this.#workouts = data;
    this.#workouts.forEach(workout => {
      this._renderWorkout(workout);
      // this._renderWorkoutMarker(workout); //we cannot add a marker to the map, which is not loaded/defined at this point
    });
  }
  reset() {
    localStorage.removeItem('workouts');

    //RELOADING THE PAGE
    location.reload();
  }
}
//creating new obj based on class App listed above
const app = new App();
// app._getPosition(); //calling this method to get position from geolocation
