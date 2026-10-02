"use client";

import { useEffect, useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { DialogProvider } from "../../context/DialogContext";
import {
  AppProvider,
  useApp,
} from "../../context/AppContext";
import { isFinanceAdmin, isGeneralAdmin } from "../../config/permissions";
import type { Role } from "../../types";
import styles from "./LoginPage.module.css";

export type AuthPageMode = "login" | "customer" | "seller";

const authCopy = {
  login: {
    title: "Welcome back",
    subtitle: "Please enter your details",
    submit: "Sign in",
    loading: "Signing in...",
    failure: "Unable to sign in. Please try again.",
  },
  customer: {
    title: "Create your account",
    subtitle: "Join ShelterHub and discover more",
    submit: "Create account",
    loading: "Creating account...",
    failure: "Unable to create your account. Please try again.",
  },
  seller: {
    title: "Start selling on ShelterHub",
    subtitle: "Set up your shop and reach new customers",
    submit: "Create seller account",
    loading: "Creating account...",
    failure: "Unable to create your account. Please try again.",
  },
} satisfies Record<
  AuthPageMode,
  {
    title: string;
    subtitle: string;
    submit: string;
    loading: string;
    failure: string;
  }
>;

const slides = [
  {
    src: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1600&q=85",
    alt: "Laptop on a desk",
    title: "Shop smarter, work better.",
    description:
      "Discover premium tech, work essentials, and everyday upgrades from trusted sellers.",
  },
  {
    src: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1600&q=85",
    alt: "Red sneakers product shot",
    title: "Find your next favorite pair.",
    description:
      "Explore stylish sneakers and everyday essentials for every move and mood.",
  },
  {
    src: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=1600&q=85",
    alt: "Subwoofer speaker product shot",
    title: "Play louder, feel more.",
    description:
      "Browse premium woofers and sound gear for a deeper, richer listening experience.",
  },
];

function destinationForRole(role: Role) {
  if (role === "seller") return "/seller";
  if (isFinanceAdmin(role)) return "/finance";
  if (isGeneralAdmin(role)) return "/admin";
  return "/customer";
}

function LoginPageContent({ mode }: Readonly<{ mode: AuthPageMode }>) {
  const router = useRouter();
  const { login, registerUser, authUser } = useApp();
  const [activeSlide, setActiveSlide] = useState(0);
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const isLogin = mode === "login";
  const isSellerRegistration = mode === "seller";
  const copy = authCopy[mode];

  const goToRoleHome = (role: Role) => {
    router.replace(destinationForRole(role));
  };

  useEffect(() => {
    if (authUser) goToRoleHome(authUser.role);
  }, [authUser]);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) return;

    const timer = window.setInterval(() => {
      setActiveSlide((index) => (index + 1) % slides.length);
    }, 7200);

    return () => window.clearInterval(timer);
  }, []);

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);

    try {
      const result = isLogin
        ? await login(email.trim(), password)
        : await registerUser({
            name: fullName.trim(),
            email: email.trim(),
            phone: phone.trim(),
            password,
            role: isSellerRegistration ? "seller" : "customer",
            sellerBusinessName: isSellerRegistration
              ? businessName.trim()
              : undefined,
          });
      if (!result.success || !result.user) {
        setError(
          result.message ||
            (isLogin
              ? "Check your email and password, then try again."
              : "Unable to create your account."),
        );
        return;
      }

      goToRoleHome(result.user.role);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : copy.failure,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.formPanel} aria-labelledby="login-heading">
        <div className={styles.formContent}>
          <button
            type="button"
            className={styles.brandButton}
            onClick={() => router.push("/")}
            aria-label="Go to the ShelterHub home page"
          >
            <span className={styles.brandMark} aria-hidden="true">
              ★
            </span>
            <span className={styles.brandText}>ShelterHub</span>
          </button>
          <header className={styles.heading}>
            <h1 id="login-heading">{copy.title}</h1>
            <p>{copy.subtitle}</p>
          </header>

          <button
            type="button"
            className={styles.googleButton}
            onClick={() =>
              setNotice(
                "Google authentication is not configured yet. Use the form below.",
              )
            }
          >
            <span className={styles.googleMark} aria-hidden="true">
              G
            </span>
            <span>
              {isLogin ? "Sign in with Google" : "Continue with Google"}
            </span>
          </button>

          <div className={styles.divider} aria-hidden="true">
            <span />
            <span>or</span>
            <span />
          </div>

          {error && (
            <p className={styles.errorMessage} role="alert">
              <AlertCircle aria-hidden="true" size={16} />
              {error}
            </p>
          )}
          {notice && (
            <output className={styles.noticeMessage} aria-live="polite">
              {notice}
            </output>
          )}

          <form className={styles.form} onSubmit={handleSubmit}>
            {!isLogin && (
              <label className={styles.field}>
                <span>
                  {isSellerRegistration ? "Contact person" : "Full name"}
                </span>
                <input
                  type="text"
                  name="name"
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                />
              </label>
            )}

            {isSellerRegistration && (
              <label className={styles.field}>
                <span>Shop or business name</span>
                <input
                  type="text"
                  name="businessName"
                  autoComplete="organization"
                  value={businessName}
                  onChange={(event) => setBusinessName(event.target.value)}
                  required
                />
              </label>
            )}

            <label className={styles.field}>
              <span>Email address</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            {!isLogin && (
              <label className={styles.field}>
                <span>Phone number</span>
                <input
                  type="tel"
                  name="phone"
                  autoComplete="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  required
                />
              </label>
            )}

            <label className={styles.field}>
              <span>Password</span>
              <span className={styles.passwordInput}>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  className={styles.visibilityButton}
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </span>
            </label>

            {isLogin && (
              <div className={styles.formOptions}>
                <span />
                <button
                  type="button"
                  className={styles.textLink}
                  onClick={() =>
                    setNotice(
                      "Password recovery is not configured yet. Please contact support.",
                    )
                  }
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              className={styles.submitButton}
              type="submit"
              disabled={loading}
            >
              {loading ? copy.loading : copy.submit}
            </button>
          </form>

          <p className={styles.signupPrompt}>
            {isLogin ? "Don’t have an account?" : "Already have an account?"}{" "}
            <button
              type="button"
              className={styles.textLink}
              onClick={() => router.push(isLogin ? "/register" : "/login")}
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
          <p className={styles.signupPrompt}>
            {isSellerRegistration
              ? "Opening a customer account?"
              : "Want to sell on ShelterHub?"}{" "}
            <button
              type="button"
              className={styles.textLink}
              onClick={() =>
                router.push(
                  isSellerRegistration ? "/register" : "/seller/register",
                )
              }
            >
              {isSellerRegistration ? "Customer sign up" : "Register your shop"}
            </button>
          </p>
        </div>
      </section>

      <section
        className={styles.visualPanel}
        aria-label="ShelterHub marketplace stories"
      >
        <div className={styles.slides}>
          {slides.map((slide, index) => (
            <div
              className={`${styles.slide} ${index === activeSlide ? styles.activeSlide : ""}`}
              key={slide.src}
              aria-hidden="true"
            >
              <img src={slide.src} alt="" />
            </div>
          ))}
        </div>
        <div className={styles.imageShade} />
        <div className={styles.caption} aria-live="polite">
          <h2>{slides[activeSlide].title}</h2>
          <p>{slides[activeSlide].description}</p>
          <div
            className={styles.slideControls}
            aria-label="Choose a featured image"
          >
            {slides.map((slide, index) => (
              <button
                key={slide.src}
                type="button"
                className={`${styles.slideDot} ${index === activeSlide ? styles.activeDot : ""}`}
                aria-label={`Show image ${index + 1}`}
                aria-pressed={index === activeSlide}
                onClick={() => setActiveSlide(index)}
              />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage({
  mode = "login",
}: Readonly<{ mode?: AuthPageMode }>) {
  return (
    <AppProvider>
      <DialogProvider>
        <LoginPageContent mode={mode} />
      </DialogProvider>
    </AppProvider>
  );
}
