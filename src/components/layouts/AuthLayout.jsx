import { AuthNavbar } from "./AuthNavbar";
import Container from "./Container";

const AuthLayout = ({ children, variant = "login" }) => {
  return (
    // Outer wrapper — full screen height, white background, vertical stack
    <div className="min-h-screen flex flex-col bg-white">
      {/* AuthNavbar — har auth page pe consistent top bar */}
      {/* variant prop se decide hota hai login/register/forgot/reset mein se kaunsa dikhana hai */}
      <AuthNavbar variant={variant} />

      {/* Main content area — center mein form aata hai */}
      <main className="flex-1 flex items-center justify-center px-4 py-10 bg-gray-50 ">
        <Container className="flex justify-center">
          <div className="w-full max-w-md bg-white rounded-2xl  border-b-gray-600 shadow-2xl p-12 sm:p-8 ">
            {children}
          </div>
        </Container>
      </main>
    </div>
  );
};

export default AuthLayout;
