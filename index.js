'use strict';

const inputForm     = document.querySelector('.input-coords-form');
const inputCoords   = document.querySelector('.input-coords');
const distanceInput = document.querySelector('#distance-input');
const durationInput = document.querySelector('#duration-input');
const elevGainInput = document.querySelector('#elev-gain-input');
const typeDropdown  = document.querySelector('#type-dropdown');
const cadenceInput  = document.querySelector('#cadence-input');
const listWorkouts  = document.querySelector('.list-workouts');
const filter        = document.querySelector('#div-filter');
const divRemoveAll  = document.querySelector('.div-remove-all');

class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10);

    constructor(coords, distance, duration) {
        this._coords    = coords;
        this._distance  = distance;
        this._duration  = duration;    
    }

    _setDescription() {
        this._description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${(this.date + "").slice(4, 7)} ${this.date.getDate()}`;
        return this;
    }
}

class Running extends Workout {
    type = "running";

    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this._cadence = cadence;    
        this._calcPace();
        this._setDescription();
    }

    _calcPace() {
        this._pace = (this._duration / this._distance).toFixed(2); 
        return this;
    }
}

class Cycling extends Workout {
    type = "cycling";

    constructor(coords, distance, duration, elevGain) {
        super(coords, distance, duration);
        this._elevGain = elevGain;
        this._calcSpeed();
        this._setDescription();
    }

    _calcSpeed() {
        this._speed = (this._distance / (this._duration / 60)).toFixed(2); 
        return this;
    }
}

class App {
    #map;
    #mapEvent;
    #workouts = [];
    #mapZoomLevel = 13;

    constructor() {
        this._bindedNewWorkout      = this._newWorkout.bind(this);
        this._bindedMakeWorkoutEdit = this._makeWorkoutEdit.bind(this);
        this._inputFormAction       = 'create';
        this._workoutEdit;

        this._getPosition();
        this._loadWorkouts();
        this._showFilter();
        this._showBtnDeleteAll();
        
        typeDropdown.addEventListener('change', this._toggleElevationField);
        listWorkouts.addEventListener('click', this._moveToPopup.bind(this));
        listWorkouts.addEventListener('click', this._editWorkout.bind(this));
        listWorkouts.addEventListener('click', this._removeWorkout.bind(this));
        filter.addEventListener('change', this._filterBy.bind(this));
        divRemoveAll.addEventListener('click', this._reset);
    }

    _getPosition() {
        if(navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function(){
                alert('Coudn\'t get your position');
            })
        }
    };

    _showFilter() {
        listWorkouts.childElementCount && filter.classList.remove('hidden');
    }

    _showBtnDeleteAll() {
        listWorkouts.childElementCount && divRemoveAll.classList.remove('hidden');
    }

    _loadMap(position) {
        const { latitude, longitude } = position.coords;
        const coordenates = [latitude, longitude];

        this.#map = L.map('map').setView(coordenates, this.#mapZoomLevel);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        this.#map.on('click', this._showForm.bind(this));
        
        this.#workouts.forEach((workout) => {
            this._renderWorkoutMarker(workout);
        });        
    };

    _showForm(mapE = null) {
        this._inputFormAction = mapE !== null ? 'create' : 'edit';
        this.#mapEvent = mapE;

        this._shiftListeners.bind(this)();
        inputCoords.classList.remove('input-hidden');
        distanceInput.focus();
    }

    _hideForm() {
        inputCoords.classList.add('input-hidden');
        distanceInput.value = durationInput.value = elevGainInput.value = cadenceInput.value = "";
    }

    _toggleElevationField() {
        cadenceInput.previousElementSibling.classList.toggle('input-hidden');
        elevGainInput.previousElementSibling.classList.toggle('input-hidden');
        cadenceInput.classList.toggle('input-hidden');
        elevGainInput.classList.toggle('input-hidden');
    }

    _newWorkout(e) {
        e.preventDefault();

        const isValid = function(...input) {
            return input.every((value) => Number.isFinite(value) && value > 0);
        }

        const typeValue     = typeDropdown.value;
        const distanceValue = +distanceInput.value;
        const durationValue = +durationInput.value;
        const elevGainValue = +elevGainInput.value;
        const cadenceValue  = +cadenceInput.value;
        const { lat, lng }  = this.#mapEvent.latlng;

        let workout;

        const workoutTypes = {
            'running': function(){
                if(!isValid(distanceValue, durationValue, cadenceValue)) {
                    alert("This values aren't valid");
                    return;
                }

                workout = new Running([lat, lng], distanceValue, durationValue, cadenceValue);
            },
            'cycling': function(){
                if(!isValid(distanceValue, durationValue, elevGainValue)) {
                    alert("This values aren't valid");
                    return;
                }

                workout = new Cycling([lat, lng], distanceValue, durationValue, elevGainValue);
            },
        }

        workoutTypes[typeValue]();

        if(workout) {
            this.#workouts.push(workout);
    
            this._renderWorkoutMarker(workout);
            this._renderWorkout(workout);
        }

        this._hideForm();
        this._showFilter();
        this._showBtnDeleteAll();
        this._setLocalStorage();
    }

    _shiftListeners() {
        const actions = {
            edit: function() {
                inputForm.removeEventListener('submit', this._bindedNewWorkout);
                inputForm.addEventListener('submit', this._bindedMakeWorkoutEdit);
            },
            create: function() {
                inputForm.removeEventListener('submit', this._bindedMakeWorkoutEdit);
                inputForm.addEventListener('submit', this._bindedNewWorkout);
            }
        }
        
        actions[this._inputFormAction].bind(this)();
    }

    _setInputForm(workout) {
        distanceInput.value = workout._distance;
        durationInput.value = workout._duration;
        cadenceInput.value  = workout._cadence ?? null;
        elevGainInput.value = workout._elevGain ?? null;
        typeDropdown.value  = workout.type;
    }

    _changeWorkoutInfo(workout) {
        const newWorkoutDescription =  workout._description.split(' ');
        newWorkoutDescription[0]    = `${typeDropdown.value[0].toUpperCase()}${typeDropdown.value.slice(1, typeDropdown.value.length)}`;

        workout._distance    = distanceInput.value;
        workout._duration    = durationInput.value;
        workout._cadence     = cadenceInput.value;
        workout._elevGain    = elevGainInput.value;
        workout.type         = typeDropdown.value;
        workout._speed       = distanceInput.value / (durationInput.value / 60);
        workout._description = newWorkoutDescription.join(' ');
    }

    _editWorkout(e) {
        e.preventDefault();

        const btnEdit = e.target.closest('.btn-edit');

        if(!btnEdit) return;

        this._workoutEdit = this.#workouts.find((wk) => wk.id === btnEdit.dataset.id);

        this._workoutEdit.type === 'cycling' && this._toggleElevationField();
        
        this._setInputForm(this._workoutEdit);
        this._showForm.bind(this)();
    }

    _makeWorkoutEdit(e) {
        e.preventDefault();

        this._changeWorkoutInfo(this._workoutEdit);
        this._setLocalStorage();
        location.reload();
    }

    _renderWorkoutMarker(workout) {
        L.marker(workout._coords).addTo(this.#map)
        .bindPopup(
            L.popup({
                maxWidth: 250,
                minWidth: 100,
                autoClose: false,
                closeOnClick: false,
                className: `map-popup ${workout.type}-border`,
            })
        )
        .setPopupContent(workout.type == 'running' ? '🏃 ' + workout._description : '🚴 ' + workout._description)
        .openPopup();
    }

    _renderWorkout(workout) {
        const type = workout.type === 'running'
        ? `<span class="activitie-span activitie-icon" id="acceleration">⚡</span>
           <span class="activitie-span activitie-value">${workout._pace}</span>
           <span class="unit">MIN/KM</span>

           <span class="activitie-span activitie-icon" id="cadence">👣</span>
           <span class="activitie-span activitie-value">${workout._cadence}</span>
           <span class="unit">SPM</span>`

        : `<span class="activitie-span activitie-icon" id="steps">🐾</span>
           <span class="activitie-span activitie-value">${workout._speed}</span>
           <span class="unit">KM/H</span>

           <span class="activitie-span activitie-icon" id="elevGain">⛰️</span>
           <span class="activitie-span activitie-value">${workout._elevGain}</span>
           <span class="unit">M</span>`;

        const html = `
        <li class="workout workout__${workout.type}" data-id="${workout.id}">
            <div class="modal-activities ${workout.type}-border">
                <a href="" class="btn-close" data-id="${workout.id}"><span class="material-symbols-outlined">close</span></a>
                <div class="activities-content">
                    <h3 class="title">${workout._description}</h3>
                    <span class="activitie-span activitie-icon" id="distance">${workout.type === 'running' ? '🏃' : '🚴'}</span>
                    <span class="activitie-span activitie-value">${workout._distance}</span>
                    <span class="unit">KM</span>

                    <span class="activitie-span activitie-icon" id="duration">⏲️</span>
                    <span class="activitie-span activities-value">${workout._duration}</span>
                    <span class="unit">MIN</span>

                    ${type}
                </div>
            </div>
            <a href="" title="Edit"class="btn btn-edit" data-id="${workout.id}"><span class="material-symbols-outlined">edit</span></a>
        </li>
        `;

        listWorkouts.insertAdjacentHTML('beforeend', html);
    }

    _moveToPopup(e) {
        const workoutEl = e.target.closest('.workout');

        if(!workoutEl) return;
        const workout = this.#workouts.find((wk) => wk.id === workoutEl.dataset.id);

        this.#map.setView(workout._coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1,
            }
        })
    }

    _setLocalStorage() {
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    }

    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem('workouts'));
        
        if(!data) return;

        this.#workouts = data;
        return this;
    }

    _loadWorkouts() {
        if(!this._getLocalStorage()) return;

        this.#workouts.forEach((workout) => {
            this._renderWorkout(workout);
        });
    }

    _reset(e) {
        e.preventDefault();
        const btnRemoveAll = e.target.closest('.btn-remove-all');

        if(!btnRemoveAll) return;

        localStorage.removeItem('workouts');
        location.reload();
    }

    _removeWorkout(e) {
        const btnClose = e.target.closest('.btn-close');

        if(!btnClose) return;

        const workout = this.#workouts.find( wk => wk.id === btnClose.dataset.id);
        const workoutIndex = this.#workouts.indexOf(workout);

        this.#workouts.splice(workoutIndex, workoutIndex + 1);

        this._setLocalStorage();

        location.reload();
    }

    _filterBy(e) {
        console.log(e);
        const workouts = this.#workouts;
        const filterActions = {
            duration: function() {
                workouts.sort((a, b) => b._duration - a._duration);
            },
            distance: function() {
                workouts.sort((a, b) => b._distance - a._distance);
            },
            date: function() {
                workouts.sort((a, b) => b.date - a.date);
            },
        }

        filterActions[e.target.value]();

        this._setLocalStorage();
        location.reload();
    }
}

const app = new App();