"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

const Signup = () => {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const router = useRouter();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.email || !form.password || !form.confirmPassword) {
      setError('Please fill all fields.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    // Simulate signup success
    setSuccess('Signup successful!');
    setError('');
    setTimeout(() => {
      router.push('/mobile');
    }, 800);
    // Reset form
    setForm({ username: '', email: '', password: '', confirmPassword: '' });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <div className="w-full max-w-xs p-4 sm:p-6 bg-white rounded-lg shadow-[5px_8px_19px_5px_rgba(0,0,0,0.25)]">
        <h2 className="text-2xl font-bold mb-4 text-center text-black">Sign Up</h2>
        <form onSubmit={handleSubmit}>
          <input
            className="w-full mb-3 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-black"
            type="text"
            name="username"
            placeholder="Username"
            value={form.username}
            onChange={handleChange}
          />
          <input
            className="w-full mb-3 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-black"
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
          />
          <input
            className="w-full mb-3 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-black"
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
          />
          <input
            className="w-full mb-3 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-black"
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            value={form.confirmPassword}
            onChange={handleChange}
          />
          {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
          {success && <div className="text-green-500 text-sm mb-2">{success}</div>}
          <button
            className="w-full bg-black text-white py-2 rounded hover:bg-gray-900 transition"
            type="submit"
          >
            Sign Up
          </button>
          <div className="mt-3 text-xs text-gray-600 text-center">
            Already have an account? <a href="/mobileauth/login" className="text-black underline hover:text-gray-900">Login</a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Signup;
