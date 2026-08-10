import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuthStore } from '../store/authStore';
import { Calendar, User, Phone, Mail, Lock } from 'lucide-react';

const loginSchema = z.object({
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['PATIENT', 'DOCTOR', 'ADMIN']).default('PATIENT'),
});

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, register, error: authError, isLoading } = useAuthStore();

  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '1234567890',
    email: '',
    password: 'password123',
    role: 'PATIENT',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear error
    if (formErrors[e.target.name]) {
      setFormErrors({ ...formErrors, [e.target.name]: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    try {
      if (isRegistering) {
        // Validate Registration
        const result = registerSchema.safeParse(formData);
        if (!result.success) {
          const errors: Record<string, string> = {};
          result.error.issues.forEach((issue) => {
            if (issue.path[0]) {
              errors[issue.path[0].toString()] = issue.message;
            }
          });
          setFormErrors(errors);
          return;
        }

        const success = await register({
          name: formData.name,
          phoneNumber: formData.phoneNumber,
          email: formData.email || undefined,
          password: formData.password,
          role: formData.role,
        });

        if (success) {
          setIsRegistering(false);
          alert('Registration successful! Please sign in.');
        }
      } else {
        // Validate Login
        const result = loginSchema.safeParse({
          phoneNumber: formData.phoneNumber,
          password: formData.password,
        });
        if (!result.success) {
          const errors: Record<string, string> = {};
          result.error.issues.forEach((issue) => {
            if (issue.path[0]) {
              errors[issue.path[0].toString()] = issue.message;
            }
          });
          setFormErrors(errors);
          return;
        }

        const success = await login(formData.phoneNumber, formData.password);
        if (success) {
          // Redirect based on role
          const currentUser = useAuthStore.getState().user;
          if (currentUser?.role === 'ADMIN') {
            navigate('/admin/dashboard');
          } else if (currentUser?.role === 'DOCTOR') {
            navigate('/doctor/dashboard');
          } else {
            navigate('/chat');
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-96 h-96 rounded-full bg-indigo-900/25 blur-3xl" />
      <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 rounded-full bg-purple-900/20 blur-3xl" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex justify-center items-center gap-3">
          <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
            <Calendar className="h-7 w-7 text-white" />
          </div>
          <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-300 bg-clip-text text-transparent">
            ClinicFlow AI
          </span>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
          {isRegistering ? 'Create your account' : 'Sign in to your portal'}
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Or{' '}
          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setFormErrors({});
            }}
            className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            {isRegistering ? 'sign in to existing account' : 'register a new patient account'}
          </button>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-slate-900/80 backdrop-blur-md py-8 px-4 border border-slate-800/80 shadow-2xl rounded-2xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {authError && (
              <div className="bg-red-900/20 border border-red-500/30 text-red-300 text-sm px-4 py-3 rounded-xl">
                {authError}
              </div>
            )}

            {isRegistering && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                    placeholder="Jane Doe"
                  />
                </div>
                {formErrors.name && <p className="mt-1 text-xs text-red-400">{formErrors.name}</p>}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Phone Number (WhatsApp No.)</label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="text"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                  placeholder="1234567890"
                />
              </div>
              {formErrors.phoneNumber && <p className="mt-1 text-xs text-red-400">{formErrors.phoneNumber}</p>}
            </div>

            {isRegistering && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-500" />
                    </div>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="block w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                      placeholder="jane@example.com"
                    />
                  </div>
                  {formErrors.email && <p className="mt-1 text-xs text-red-400">{formErrors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Portal Role</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                  >
                    <option value="PATIENT">Patient Account</option>
                    <option value="DOCTOR">Doctor Account</option>
                    <option value="ADMIN">Clinic Admin</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                  placeholder="••••••••"
                />
              </div>
              {formErrors.password && <p className="mt-1 text-xs text-red-400">{formErrors.password}</p>}
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-900 transition-all disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : isRegistering ? 'Create Account' : 'Sign In'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
export default Login;
