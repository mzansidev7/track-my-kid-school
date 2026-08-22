import { useState } from "react";
import {
  FiAlertCircle,
  FiChevronDown,
  FiClock,
  FiCrosshair,
  FiLayers,
  FiMapPin,
  FiPhone,
  // FiSearch,
  FiUsers,
} from "react-icons/fi";
import { FaBus } from "react-icons/fa";
import "../styles/liveTracking.css";

const activeTrips = [
  {
    vehicle: "GP 45 CD GP",
    driver: "John Mokoena",
    route: "Route 1",
    location: "Justice St (Stop 4)",
    speed: "36 km/h",
    eta: "07:45 AM",
    progress: "62%",
    status: "On Route",
    tone: "purple",
  },
  {
    vehicle: "GP 12 AB GP",
    driver: "Sarah Jacobs",
    route: "Route 2",
    location: "Park St (Stop 3)",
    speed: "22 km/h",
    eta: "07:50 AM",
    progress: "48%",
    status: "Delayed",
    tone: "blue",
  },
  {
    vehicle: "GP 78 XY GP",
    driver: "Thabo Nkosi",
    route: "Route 3",
    location: "Arcadia St (Stop 2)",
    speed: "28 km/h",
    eta: "07:47 AM",
    progress: "33%",
    status: "On Route",
    tone: "green",
  },
];

function LiveTracking() {
  const [selectedVehicle, setSelectedVehicle] = useState(activeTrips[0]);

  return (
    <>
      {/* <header className="portal-topbar">
        <div className="portal-breadcrumb">
          <span>Schools</span>
          <b>›</b>
          <strong>Live Tracking</strong>
        </div>
        <div className="portal-top-actions">
          <label className="portal-search">
            <FiSearch />
            <input placeholder="Search vehicles..." />
          </label>
          <button className="icon-button" aria-label="Notifications">
            <FiAlertCircle />
            <b>5</b>
          </button>
          <div className="top-profile">
            <img src="https://i.pravatar.cc/100?img=5" alt="School admin" />
            <span>
              <strong>School Admin</strong>
              <small>Administrator</small>
            </span>
            <b>⌄</b>
          </div>
        </div>
      </header> */}
      <div className="portal-content tracking-content">
        <section className="tracking-heading">
          <div>
            <p className="page-kicker">REAL-TIME MONITORING</p>
            <h1>Live Tracking</h1>
            <p>Track vehicles and trips in real-time.</p>
          </div>
          <div className="tracking-controls">
            <button>
              All Routes <FiChevronDown />
            </button>
            <button>
              <FiAlertCircle /> Filters
            </button>
            <button aria-label="Full screen">⛶</button>
          </div>
        </section>
        <section className="tracking-metrics">
          <article>
            <span className="tracking-metric green">
              <FaBus />
            </span>
            <div>
              <small>Active vehicles</small>
              <strong>18</strong>
              <em>On the move</em>
            </div>
          </article>
          <article>
            <span className="tracking-metric green">
              <FiClock />
            </span>
            <div>
              <small>On time</small>
              <strong>15</strong>
              <em>83.3%</em>
            </div>
          </article>
          <article>
            <span className="tracking-metric orange">
              <FiClock />
            </span>
            <div>
              <small>Delayed</small>
              <strong>3</strong>
              <em>16.7%</em>
            </div>
          </article>
          <article>
            <span className="tracking-metric purple">
              <FiCrosshair />
            </span>
            <div>
              <small>Completed trips</small>
              <strong>22</strong>
              <em>Today</em>
            </div>
          </article>
          <article>
            <span className="tracking-metric blue">
              <FiUsers />
            </span>
            <div>
              <small>Total students</small>
              <strong>368</strong>
              <em>Being transported</em>
            </div>
          </article>
        </section>
        <section className="tracking-layout">
          <div className="tracking-main">
            <div className="tracking-map">
              <div className="map-switch">
                <button className="selected">Map</button>
                <button>Satellite</button>
              </div>
              <div className="map-controls">
                <button>+</button>
                <button>-</button>
                <button>
                  <FiCrosshair />
                </button>
                <button>
                  <FiLayers />
                </button>
              </div>
              <div className="map-roads">
                <span className="road road-purple" />
                <span className="road road-blue" />
                <span className="road road-green" />
                <span className="map-label brooklyn">Brooklyn</span>
                <span className="map-label arcadia">Arcadia</span>
                <span className="map-label hatfield">Hatfield</span>
                <span className="map-label lynwood">Lynwood</span>
              </div>
              <div className="map-route route-one">
                <i />
                <i />
                <i />
                <i />
                <b>
                  <FaBus />
                </b>
              </div>
              <div className="map-route route-two">
                <i />
                <i />
                <i />
                <b>
                  <FaBus />
                </b>
              </div>
              <div className="map-route route-three">
                <i />
                <i />
                <b>
                  <FaBus />
                </b>
              </div>
              <div className="vehicle-popover">
                <strong>{selectedVehicle.vehicle}</strong>
                <span>On Route</span>
                <small>👤 {selectedVehicle.driver}</small>
                <small>
                  <FiMapPin /> {selectedVehicle.route} - Brooklyn → School
                </small>
              </div>
              <div className="map-legend">
                <strong>Vehicle Status</strong>
                <span>
                  <i className="legend-green" /> On Route
                </span>
                <span>
                  <i className="legend-orange" /> Delayed
                </span>
                <span>
                  <i className="legend-blue" /> Stopped
                </span>
                <span>
                  <i className="legend-gray" /> Offline
                </span>
              </div>
            </div>
            <div className="active-trips">
              <div className="active-trips-head">
                <h2>Active Trips</h2>
                <span>Updated just now</span>
              </div>
              <div className="active-trips-table">
                <div className="active-trip-row active-trip-header">
                  <span>Vehicle</span>
                  <span>Driver</span>
                  <span>Route</span>
                  <span>Status</span>
                  <span>Current Location</span>
                  <span>Speed</span>
                  <span>ETA</span>
                  <span>Progress</span>
                  <span />
                </div>
                {activeTrips.map((trip) => (
                  <button
                    className={`active-trip-row ${selectedVehicle.vehicle === trip.vehicle ? "selected" : ""}`}
                    key={trip.vehicle}
                    onClick={() => setSelectedVehicle(trip)}
                  >
                    <span>
                      <b className={`mini-vehicle ${trip.tone}`}>
                        <FaBus />
                      </b>
                      {trip.vehicle}
                    </span>
                    <span>{trip.driver}</span>
                    <span>
                      {trip.route}
                      <small>Morning → School</small>
                    </span>
                    <span>
                      <em
                        className={`tracking-status ${trip.status.toLowerCase().replace(" ", "-")}`}
                      >
                        {trip.status}
                      </em>
                    </span>
                    <span>{trip.location}</span>
                    <span className="speed-tag">{trip.speed}</span>
                    <span>{trip.eta}</span>
                    <span>
                      <strong>{trip.progress}</strong>
                      <i className={`progress-bar ${trip.tone}`} />
                    </span>
                    <span>
                      <FiMapPin /> •••
                    </span>
                  </button>
                ))}
              </div>
              <button className="all-trips-link">View All Trips →</button>
            </div>
          </div>
          <aside className="selected-vehicle">
            <div className="selected-vehicle-head">
              <div>
                <h2>Selected Vehicle</h2>
              </div>
              <button aria-label="Close">×</button>
            </div>
            <div className="vehicle-profile">
              <span className="vehicle-large">
                <FaBus />
              </span>
              <div>
                <strong>{selectedVehicle.vehicle}</strong>
                <small>Toyota Quantum</small>
                <small>Driver: {selectedVehicle.driver}</small>
              </div>
              <span className="on-route">On Route</span>
              <button aria-label="Call driver">
                <FiPhone />
              </button>
            </div>
            <div className="route-summary">
              <div>
                <strong>{selectedVehicle.route} - Brooklyn → School</strong>
                <small>Trip #TRP-00123</small>
              </div>
              <dl>
                <dt>Start Time</dt>
                <dd>07:00 AM</dd>
                <dt>Est. Arrival</dt>
                <dd>07:45 AM</dd>
                <dt>Progress</dt>
                <dd>62%</dd>
              </dl>
              <i className="detail-progress" />
            </div>
            <div className="next-stop">
              <div>
                <h3>Next Stop</h3>
                <strong>
                  <FiMapPin /> Justice St (Stop 4)
                </strong>
                <small>3.2 km away</small>
              </div>
              <b>
                ETA<em>5 min</em>
              </b>
            </div>
            <div className="all-stops">
              <h3>All Stops (9)</h3>
              {[
                "Brooklyn Start Point",
                "First Ave (Stop 1)",
                "Main Rd (Stop 2)",
                "Park St (Stop 3)",
                "Justice St (Stop 4)",
                "Lynwood St (Stop 5)",
                "Arcadia St (Stop 6)",
                "Pretoria High School (Stop 7)",
                "Sunshine Primary School",
              ].map((stop, index) => (
                <div
                  className={`stop-row ${index === 4 ? "current" : index < 4 ? "completed" : ""}`}
                  key={stop}
                >
                  <i>{index < 4 ? "✓" : index === 4 ? "•" : ""}</i>
                  <span>
                    {stop}
                    <small>
                      {index === 0
                        ? "Departed"
                        : index === 4
                          ? "Next stop"
                          : index === 8
                            ? "Final destination"
                            : ""}
                    </small>
                  </span>
                  <b>
                    {
                      [
                        "07:00 AM",
                        "07:05 AM",
                        "07:10 AM",
                        "07:15 AM",
                        "07:20 AM",
                        "07:25 AM",
                        "07:30 AM",
                        "07:35 AM",
                        "07:45 AM",
                      ][index]
                    }
                  </b>
                </div>
              ))}
            </div>
            <button className="trip-details-button">
              View Full Trip Details →
            </button>
          </aside>
        </section>
      </div>
    </>
  );
}

export default LiveTracking;
