import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const defaultValues = {
  name: "",
  email: "",
  password: "",
  role: "student",
  location: "",
  city: "",
  state: "",
  latitude: "",
  longitude: "",
};

export const Register = () => {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({ defaultValues });

  const { register: registerUser, loading } = useAuth();
  const navigate = useNavigate();
  const [geoError, setGeoError] = useState("");
  const [geoEnabled, setGeoEnabled] = useState(false);

  const onSubmit = async (values) => {
    const payload = {
      ...values,
      latitude: values.latitude ? Number(values.latitude) : null,
      longitude: values.longitude ? Number(values.longitude) : null,
    };
    try {
      await registerUser(payload);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error("Registration error:", error);
      alert(error?.response?.data?.detail || error?.message || "Registration failed. Please try again.");
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported in this browser.");
      return;
    }
    setGeoError("Fetching location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoError("");
        setGeoEnabled(true);
        setValue("latitude", position.coords.latitude.toFixed(6));
        setValue("longitude", position.coords.longitude.toFixed(6));
      },
      (error) => {
        console.error("Geolocation error:", error);
        setGeoError(error.message || "Unable to fetch your location. Please enter it manually.");
        setGeoEnabled(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="page auth-page">
      <div className="card">
        <h2>Create account</h2>
        <p>Teach, learn, and collaborate with mentorship-ready tools.</p>
        <form className="form-grid" onSubmit={handleSubmit(onSubmit)}>
          <div className="form-control">
            <label htmlFor="name">Full name</label>
            <input id="name" placeholder="Jane Doe" {...register("name", { required: "Name is required" })} />
            {errors.name && <small className="error">{errors.name.message}</small>}
          </div>
          <div className="form-control">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" placeholder="you@email.com" {...register("email", { required: "Email is required" })} />
            {errors.email && <small className="error">{errors.email.message}</small>}
          </div>
          <div className="form-control">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Min 6 characters"
              {...register("password", { required: "Password is required", minLength: 6 })}
            />
            {errors.password && <small className="error">{errors.password.message}</small>}
          </div>
          <div className="form-control">
            <label htmlFor="role">Role</label>
            <select id="role" {...register("role", { required: true })}>
              <option value="student">Student</option>
              <option value="mentor">Mentor</option>
            </select>
          </div>
          <div className="form-control">
            <label htmlFor="location">Location</label>
            <input id="location" placeholder="City or remote" {...register("location", { required: "Location is required" })} />
            {errors.location && <small className="error">{errors.location.message}</small>}
          </div>
          <div className="location-panel">
            <div>
              <strong>Enable precise location</strong>
              <p>Use GPS to auto-fill your latitude & longitude for better nearby recommendations.</p>
            </div>
            <button type="button" className="btn btn-secondary" onClick={handleDetectLocation}>
              {geoEnabled ? "Location Enabled" : "Enable Location"}
            </button>
          </div>
          {geoError && <small className="error">{geoError}</small>}
          <div className="location-grid">
            <div className="form-control">
              <label htmlFor="city">City / District</label>
              <input id="city" placeholder="e.g., Bengaluru" {...register("city", { required: "City is required" })} />
              {errors.city && <small className="error">{errors.city.message}</small>}
            </div>
            <div className="form-control">
              <label htmlFor="state">State</label>
              <input id="state" placeholder="e.g., Karnataka" {...register("state")} />
            </div>
            <div className="form-control">
              <label htmlFor="latitude">Latitude</label>
              <input id="latitude" placeholder="12.9716" {...register("latitude")} readOnly />
            </div>
            <div className="form-control">
              <label htmlFor="longitude">Longitude</label>
              <input id="longitude" placeholder="77.5946" {...register("longitude")} readOnly />
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;

