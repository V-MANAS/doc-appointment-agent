import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { CreditCard, CheckCircle, ShieldCheck, AlertCircle } from 'lucide-react';

export const MockCheckout: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const appointmentId = searchParams.get('appointmentId') || '';
  
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!appointmentId) {
      setError('Invalid checkout session: missing appointmentId.');
    }
  }, [appointmentId]);

  const handlePay = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Simulate the Stripe webhook payload
      const mockWebhookPayload = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: `pi_mock_${Math.random().toString(36).substring(2, 11)}`,
            metadata: {
              appointmentId: appointmentId,
            },
          },
        },
      };

      // Hit our backend Stripe Webhook endpoint directly to simulate payment completion
      await api.post('/payments/webhook', mockWebhookPayload);

      setSuccess(true);
      setIsLoading(false);
    } catch (err: any) {
      console.error(err);
      setError('Simulated payment webhook failed to register on the server.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl p-6 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl" />

        {success ? (
          <div className="text-center py-8">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-emerald-500 animate-bounce" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 font-display">Payment Successful!</h2>
            <p className="text-slate-400 text-sm mb-6">
              Stripe checkout completed. The AI Assistant has updated your booking status in real-time.
            </p>
            <button
              onClick={() => navigate('/chat')}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-emerald-500/20"
            >
              Return to Clinic Portal
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
              <div className="bg-indigo-900/40 p-2 rounded-lg text-indigo-400">
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Stripe Checkout Sandbox</h2>
                <p className="text-xs text-slate-500">Secure simulated gateway</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 bg-red-950/30 border border-red-500/30 text-red-300 text-xs p-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-800/60 mb-6 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Merchant</span>
                <span className="text-slate-200 font-medium">Doctor Clinic Booking</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Description</span>
                <span className="text-slate-200 font-medium">Consultation Appointment</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Appointment Ref</span>
                <span className="text-slate-300 font-mono text-xs bg-slate-900 px-1.5 py-0.5 rounded">
                  {appointmentId.slice(0, 8) || 'N/A'}...
                </span>
              </div>
              <div className="border-t border-slate-800/80 my-2 pt-2 flex justify-between text-base font-bold">
                <span className="text-slate-200">Amount Due</span>
                <span className="text-indigo-400">$50.00 USD</span>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-500">
                This is a simulation sandbox. Clicking pay will send a mock success callback containing metadata hooks to update your appointment.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => navigate('/chat')}
                className="flex-1 py-2.5 px-4 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl font-semibold transition-all text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handlePay}
                disabled={isLoading || !appointmentId}
                className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all text-sm disabled:opacity-50 shadow-lg shadow-indigo-500/20"
              >
                {isLoading ? 'Processing...' : 'Pay $50.00'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default MockCheckout;
