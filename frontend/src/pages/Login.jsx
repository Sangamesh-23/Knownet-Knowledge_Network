import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const defaultValues = { email: "", password: "", location: "" };

export const Login = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues });

  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading } = useAuth();

  const onSubmit = async (values) => {
    await login(values);
    const redirectTo = location.state?.from?.pathname || "/dashboard";
    navigate(redirectTo, { replace: true });
  };

  return (
    <div className="page auth-page">
      <div className="card">
        <h2>Welcome back</h2>
        <p>Sign in to continue learning with KnowNet.</p>
        <form className="form-grid" onSubmit={handleSubmit(onSubmit)}>
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
              placeholder="••••••••"
              {...register("password", { required: "Password is required" })}
            />
            {errors.password && <small className="error">{errors.password.message}</small>}
          </div>
          <div className="form-control">
            <label htmlFor="location">Location</label>
            <input id="location" placeholder="City or virtual" {...register("location")} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;

