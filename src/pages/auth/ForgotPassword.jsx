import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { AiOutlineMail, AiOutlineArrowRight } from "react-icons/ai";
import { BsShieldCheck } from "react-icons/bs";
import AuthLayout from "../../components/layouts/AuthLayout";
import Button from "../../components/ui/Button";
import { forgotPassword } from "../../api/auth.api";
import { showError } from "../../components/ui/Toast";
import { ROUTES } from "../../constants/routes";

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(255, "Email is too long"),
});

const ForgotPassword = () => {
  const [emailSent, setEmailSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    // Live validation (industry-standard pattern, same one Gmail/Amazon/
    // most production sites use): a field is left completely alone while
    // the user is still typing into it for the first time -- no error,
    // no matter how invalid the in-progress value looks. The first check
    // happens on "blur", i.e. the moment the user leaves that field
    // (Tab key or clicking elsewhere) -- mode: "onTouched" below. From
    // that point on, react-hook-form's default reValidateMode ("onChange")
    // takes over automatically: if the field was invalid, it re-checks on
    // every keystroke so the error clears the instant the value becomes
    // valid, without needing another blur.
    mode: "onTouched",
    defaultValues: { email: "" },
  });

  const forgotMutation = useMutation({
    mutationFn: forgotPassword,

    onSuccess: (_, variables) => {
      setSubmittedEmail(variables.email);
      setEmailSent(true);
    },

    onError: (error) => {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        "Something went wrong. Please try again.";
      showError(message);
    },
  });

  const onSubmit = (data) => {
    forgotMutation.mutate({ email: data.email });
  };

  return (
    <AuthLayout variant="forgotPassword">
      {/* SUCCESS STATE */}
      {emailSent ? (
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <AiOutlineMail className="w-8 h-8 text-primary" />
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-gray-900">
              Check Your Email
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              We've sent a password reset link to{" "}
              <span className="font-medium text-gray-700">
                {submittedEmail}
              </span>
              . Please check your inbox.
            </p>
          </div>

          <p className="text-sm text-gray-500">
            Didn't receive the email?{" "}
            <button
              onClick={() => setEmailSent(false)}
              className="text-primary font-medium hover:underline"
            >
              Try again
            </button>
          </p>
        </div>
      ) : (
        // FORM STATE
        <div className="flex flex-col gap-8">
          <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <BsShieldCheck className="w-7 h-7 text-primary" />
            </div>

            <div className="text-center flex flex-col gap-1.5">
              <h1 className="text-2xl font-bold text-gray-900">
                Forgot Password?
              </h1>
              <p className="text-sm text-gray-500 leading-relaxed">
                No worries! Enter your email and we'll send you reset
                instructions.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-5"
            noValidate
          >
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-sm font-medium text-gray-700"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="name@company.com"
                autoComplete="email"
                {...register("email")}
                className={`
                  w-full px-4 py-2.5 text-sm rounded-lg border bg-white
                  placeholder:text-gray-400 text-gray-900
                  focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
                  transition-all duration-150
                  ${errors.email ? "border-danger focus:ring-danger focus:border-danger" : "border-gray-200"}
                `}
              />
              {errors.email && (
                <p className="text-xs text-danger">{errors.email.message}</p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={forgotMutation.isPending}
              rightIcon={
                !forgotMutation.isPending && (
                  <AiOutlineArrowRight className="w-4 h-4" />
                )
              }
            >
              Send Reset Link
            </Button>
          </form>
        </div>
      )}
    </AuthLayout>
  );
};

export default ForgotPassword;
