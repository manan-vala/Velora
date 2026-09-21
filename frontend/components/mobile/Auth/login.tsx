"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

const Login = () => {
  const [form, setForm] = useState({
    username: '',
    password: '',
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
    if (!form.username || !form.password) {
      setError('Please fill all fields.');
      return;
    }
    // Simulate login success
    setSuccess('Login successful!');
    setError('');
    setTimeout(() => {
      router.push('/mobile');
    }, 800);
    // Reset form
    setForm({ username: '', password: '' });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <div className="w-full max-w-xs p-4 sm:p-6 bg-white rounded-lg shadow-[5px_8px_19px_5px_rgba(0,0,0,0.25)]">
        <h2 className="text-2xl font-bold mb-4 text-center text-black">Login</h2>
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
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
          />
          {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
          {success && <div className="text-green-500 text-sm mb-2">{success}</div>}
          <button
            className="w-full bg-black text-white py-2 rounded hover:bg-gray-900 transition"
            type="submit"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
