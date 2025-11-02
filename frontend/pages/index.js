import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

const HomePage = () => {
    const router = useRouter();
    const [heroImage, setHeroImage] = useState(0);
    const [mounted, setMounted] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    // Beautiful curated travel images
    const heroImages = [
        {
            url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&h=900&fit=crop&q=90',
            title: 'Mountain Adventure',
            location: 'Swiss Alps'
        },
        {
            url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1600&h=900&fit=crop&q=90',
            title: 'Tropical Paradise',
            location: 'Maldives'
        },
        {
            url: 'https://images.unsplash.com/photo-1528164344705-47542687000d?w=1600&h=900&fit=crop&q=90',
            title: 'Ancient Wonders',
            location: 'Japan'
        },
        {
            url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1600&h=900&fit=crop&q=90',
            title: 'City Lights',
            location: 'Paris'
        },
        {
            url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&h=900&fit=crop&q=90',
            title: 'Beach Escape',
            location: 'Tropical Coast'
        }
    ];

    useEffect(() => {
        setMounted(true);
        
        // Scroll effect for header
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        
        window.addEventListener('scroll', handleScroll);
        
        // Auto-rotate hero images
        const interval = setInterval(() => {
            setHeroImage((prev) => (prev + 1) % heroImages.length);
        }, 5000);

        // Smooth scrolling for anchor links
        const handleAnchorClick = (e) => {
            const href = e.target.getAttribute('href');
            if (href && href.startsWith('#')) {
                e.preventDefault();
                
                const targetId = href;
                if(targetId === '#') return;
                
                const targetElement = document.querySelector(targetId);
                if(targetElement) {
                    window.scrollTo({
                        top: targetElement.offsetTop - 80,
                        behavior: 'smooth'
                    });
                    
                    const nav = document.querySelector('nav');
                    if (nav && nav.classList.contains('active')) {
                        nav.classList.remove('active');
                    }
                }
            }
        };

        // Mobile menu toggle
        const setupMobileMenu = () => {
            const mobileMenu = document.querySelector('.mobile-menu');
            const nav = document.querySelector('nav');
            
            if (mobileMenu && nav) {
                const handleMobileMenuClick = () => {
                    nav.classList.toggle('active');
                };
                
                mobileMenu.addEventListener('click', handleMobileMenuClick);
                
                return () => {
                    mobileMenu.removeEventListener('click', handleMobileMenuClick);
                };
            }
            return () => {};
        };

        const anchorLinks = document.querySelectorAll('a[href^="#"]');
        anchorLinks.forEach(anchor => {
            anchor.addEventListener('click', handleAnchorClick);
        });

        const mobileMenuCleanup = setupMobileMenu();

        return () => {
            clearInterval(interval);
            window.removeEventListener('scroll', handleScroll);
            anchorLinks.forEach(anchor => {
                anchor.removeEventListener('click', handleAnchorClick);
            });
            
            if (mobileMenuCleanup) {
                mobileMenuCleanup();
            }
        };
    }, []);

    const handleGetStarted = () => {
        router.push('/loggin_signup');
    };

    if (!mounted) {
        return null;
    }

    return (
        <div>
            <style>{`
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
                    overflow-x: hidden;
                }

                /* Header Styles */
                header {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    background: ${scrolled ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.1)'};
                    backdrop-filter: blur(20px);
                    box-shadow: ${scrolled ? '0 4px 30px rgba(0, 0, 0, 0.1)' : 'none'};
                    z-index: 1000;
                    padding: 1rem 0;
                    transition: all 0.3s ease;
                }

                .container {
                    max-width: 1400px;
                    margin: 0 auto;
                    padding: 0 2rem;
                }

                .header-content {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .logo-container {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .logo-img {
                    height: 60px;
                    width: auto;
                    object-fit: contain;
                    filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.2));
                    transition: transform 0.3s ease;
                    background: white;
                    padding: 5px;
                    border-radius: 12px;
                }

                .logo-img:hover {
                    transform: scale(1.05) rotate(2deg);
                }

                .logo {
                    font-size: 1.6rem;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: ${scrolled ? '#1e2a4a' : 'white'};
                    background: ${scrolled ? 'transparent' : 'rgba(255, 255, 255, 0.2)'};
                    padding: ${scrolled ? '0' : '0.6rem 1.2rem'};
                    border-radius: 50px;
                    backdrop-filter: ${scrolled ? 'none' : 'blur(10px)'};
                    border: ${scrolled ? 'none' : '2px solid rgba(255, 255, 255, 0.3)'};
                    transition: all 0.3s ease;
                }

                .logo i {
                    color: ${scrolled ? '#4a6cf7' : 'white'};
                    font-size: 1.4rem;
                }

                .mobile-menu {
                    display: none;
                    font-size: 1.8rem;
                    color: ${scrolled ? '#1e2a4a' : 'white'};
                    cursor: pointer;
                    padding: 0.5rem;
                    z-index: 1001;
                    transition: color 0.3s ease;
                }

                nav {
                    position: relative;
                    z-index: 999;
                }

                nav ul {
                    display: flex;
                    list-style: none;
                    gap: 2.5rem;
                }

                nav li {
                    position: relative;
                    z-index: 999;
                }

                nav a {
                    text-decoration: none;
                    color: ${scrolled ? '#1e2a4a !important' : 'white !important'};
                    font-weight: 600;
                    font-size: 1.05rem;
                    position: relative;
                    transition: all 0.3s ease;
                    padding: 0.5rem 1rem;
                    display: block;
                    z-index: 999;
                    border-radius: 50px;
                }

                nav a:hover {
                    background: ${scrolled ? 'rgba(74, 108, 247, 0.1)' : 'rgba(255, 255, 255, 0.2)'};
                    color: ${scrolled ? '#4a6cf7 !important' : 'white !important'};
                    transform: translateY(-2px);
                }

                /* Hero Section */
                .hero {
                    min-height: 100vh;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    display: flex;
                    align-items: center;
                    padding-top: 140px;
                    padding-bottom: 100px;
                    position: relative;
                    overflow: hidden;
                }

                .hero::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: 
                        radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
                        radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
                    pointer-events: none;
                }

                .hero-content {
                    display: grid;
                    grid-template-columns: 0.8fr 1.6fr;
                    gap: 3rem;
                    align-items: center;
                    position: relative;
                    z-index: 1;
                }

                .hero-text {
                    color: white;
                    animation: fadeInUp 1s ease-out;
                }

                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .hero-text h1 {
                    font-size: 3.8rem;
                    margin-bottom: 1.5rem;
                    line-height: 1.2;
                    text-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                    font-weight: 800;
                    background: linear-gradient(to right, #ffffff, #e0e7ff);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .hero-text p {
                    font-size: 1.3rem;
                    margin-bottom: 2.5rem;
                    line-height: 1.8;
                    opacity: 0.95;
                    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                }

                .hero-stats {
                    display: flex;
                    gap: 3rem;
                    margin-bottom: 2.5rem;
                }

                .stat-item {
                    display: flex;
                    flex-direction: column;
                    gap: 0.3rem;
                }

                .stat-number {
                    font-size: 2.5rem;
                    font-weight: 800;
                    color: white;
                    text-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
                }

                .stat-label {
                    font-size: 0.95rem;
                    opacity: 0.9;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }

                .btn {
                    background: white;
                    color: #4a6cf7;
                    border: none;
                    padding: 1.3rem 3.5rem;
                    font-size: 1.15rem;
                    font-weight: 700;
                    border-radius: 50px;
                    cursor: pointer;
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                    position: relative;
                    overflow: hidden;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.8rem;
                }

                .btn::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                    transition: left 0.5s;
                }

                .btn:hover::before {
                    left: 100%;
                }

                .btn:hover {
                    transform: translateY(-5px) scale(1.05);
                    box-shadow: 0 15px 40px rgba(74, 108, 247, 0.4);
                    background: #4a6cf7;
                    color: white;
                }

                .btn i {
                    font-size: 1.1rem;
                }

                .hero-image {
                    position: relative;
                    height: 600px;
                    width: 100%;
                    border-radius: 30px;
                    overflow: hidden;
                    box-shadow: 0 30px 90px rgba(0, 0, 0, 0.5);
                    animation: float 6s ease-in-out infinite;
                }

                @keyframes float {
                    0%, 100% {
                        transform: translateY(0px);
                    }
                    50% {
                        transform: translateY(-20px);
                    }
                }

                .hero-image-slider {
                    position: relative;
                    width: 100%;
                    height: 100%;
                }

                .hero-image img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    object-position: center center;
                    position: absolute;
                    top: 0;
                    left: 0;
                    opacity: 0;
                    transition: opacity 1.5s ease-in-out;
                    transform: scale(1);
                }

                .hero-image img.active {
                    opacity: 1;
                    animation: zoomIn 10s ease-in-out;
                }

                @keyframes zoomIn {
                    from {
                        transform: scale(1.05);
                    }
                    to {
                        transform: scale(1);
                    }
                }

                .image-overlay {
                    position: absolute;
                    bottom: 70px;
                    left: 0;
                    right: 0;
                    background: linear-gradient(to top, rgba(0,0,0,0.85), transparent);
                    padding: 2.5rem;
                    color: white;
                    z-index: 10;
                    backdrop-filter: blur(5px);
                }

                .image-overlay h3 {
                    font-size: 2rem;
                    margin-bottom: 0.5rem;
                    font-weight: 700;
                    text-shadow: 0 2px 10px rgba(0,0,0,0.5);
                }

                .image-overlay p {
                    font-size: 1.2rem;
                    opacity: 0.95;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .image-overlay i {
                    color: #4a6cf7;
                }

                .image-dots {
                    position: absolute;
                    bottom: 30px;
                    left: 50%;
                    transform: translateX(-50%);
                    display: flex;
                    gap: 12px;
                    z-index: 20;
                }

                .dot {
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.4);
                    cursor: pointer;
                    transition: all 0.4s ease;
                    border: 2px solid rgba(255, 255, 255, 0.2);
                }

                .dot.active {
                    background: white;
                    transform: scale(1.4);
                    border-color: rgba(255, 255, 255, 0.8);
                    box-shadow: 0 0 15px rgba(255, 255, 255, 0.6);
                }

                .dot:hover {
                    background: rgba(255, 255, 255, 0.8);
                    transform: scale(1.3);
                }

                .image-nav {
                    position: absolute;
                    top: 50%;
                    transform: translateY(-50%);
                    background: rgba(255, 255, 255, 0.95);
                    border: none;
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.5rem;
                    color: #1e2a4a;
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    z-index: 20;
                    box-shadow: 0 6px 25px rgba(0, 0, 0, 0.3);
                }

                .image-nav:hover {
                    background: #4a6cf7;
                    color: white;
                    transform: translateY(-50%) scale(1.2);
                    box-shadow: 0 8px 30px rgba(74, 108, 247, 0.4);
                }

                .image-nav.prev {
                    left: 25px;
                }

                .image-nav.next {
                    right: 25px;
                }

                /* Features Section */
                .features {
                    padding: 8rem 2rem;
                    background: linear-gradient(180deg, #ffffff 0%, #f8f9ff 100%);
                    position: relative;
                }

                .section-title {
                    text-align: center;
                    margin-bottom: 5rem;
                    animation: fadeInUp 1s ease-out;
                }

                .section-title h2 {
                    font-size: 3.2rem;
                    color: #1e2a4a;
                    margin-bottom: 1rem;
                    font-weight: 800;
                    position: relative;
                    display: inline-block;
                }

                .section-title h2::after {
                    content: '';
                    position: absolute;
                    bottom: -10px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 100px;
                    height: 5px;
                    background: linear-gradient(90deg, #4a6cf7, #ff6b6b);
                    border-radius: 10px;
                }

                .section-title p {
                    font-size: 1.3rem;
                    color: #64748b;
                    margin-top: 2rem;
                }

                .features-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
                    gap: 3rem;
                }

                .feature-card {
                    background: white;
                    padding: 3rem;
                    border-radius: 25px;
                    box-shadow: 0 15px 50px rgba(0, 0, 0, 0.08);
                    transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    position: relative;
                    overflow: hidden;
                }

                .feature-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 5px;
                    background: linear-gradient(90deg, #4a6cf7, #ff6b6b);
                    transform: scaleX(0);
                    transition: transform 0.5s ease;
                }

                .feature-card:hover::before {
                    transform: scaleX(1);
                }

                .feature-card:hover {
                    transform: translateY(-15px) scale(1.02);
                    box-shadow: 0 25px 70px rgba(74, 108, 247, 0.25);
                }

                .feature-icon {
                    width: 90px;
                    height: 90px;
                    background: linear-gradient(135deg, #4a6cf7, #ff6b6b);
                    border-radius: 25px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 2.8rem;
                    color: white;
                    margin-bottom: 1.8rem;
                    transition: all 0.4s ease;
                    box-shadow: 0 10px 30px rgba(74, 108, 247, 0.3);
                }

                .feature-card:hover .feature-icon {
                    transform: scale(1.15) rotate(5deg);
                    box-shadow: 0 15px 40px rgba(74, 108, 247, 0.4);
                }

                .feature-icon i {
                    color: white;
                    font-size: 2.8rem;
                }

                .feature-card h3 {
                    font-size: 1.7rem;
                    color: #1e2a4a;
                    margin-bottom: 1.2rem;
                    font-weight: 700;
                }

                .feature-card ul {
                    list-style: none;
                    color: #64748b;
                    padding: 0;
                }

                .feature-card li {
                    padding: 0.7rem 0;
                    padding-left: 2rem;
                    position: relative;
                    line-height: 1.7;
                    font-size: 1.05rem;
                }

                .feature-card li:before {
                    content: '';
                    position: absolute;
                    left: 0;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 20px;
                    height: 20px;
                    background: linear-gradient(135deg, #4a6cf7, #ff6b6b);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .feature-card li:after {
                    content: '✓';
                    position: absolute;
                    left: 5px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: white;
                    font-weight: bold;
                    font-size: 0.9rem;
                }

                /* How It Works Section */
                .how-it-works {
                    padding: 8rem 2rem;
                    background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%);
                    position: relative;
                    overflow: hidden;
                }

                .how-it-works::before {
                    content: '';
                    position: absolute;
                    top: -50%;
                    right: -10%;
                    width: 500px;
                    height: 500px;
                    background: radial-gradient(circle, rgba(74, 108, 247, 0.1) 0%, transparent 70%);
                    border-radius: 50%;
                }

                .steps {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: 3rem;
                    position: relative;
                }

                .step {
                    text-align: center;
                    padding: 2.5rem;
                    transition: transform 0.4s ease;
                    position: relative;
                }

                .step:hover {
                    transform: translateY(-15px);
                }

                .step-number {
                    width: 90px;
                    height: 90px;
                    background: linear-gradient(135deg, #4a6cf7, #ff6b6b);
                    color: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 2.5rem;
                    font-weight: 800;
                    margin: 0 auto 1.8rem;
                    box-shadow: 0 15px 40px rgba(74, 108, 247, 0.4);
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    position: relative;
                }

                .step-number::before {
                    content: '';
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #4a6cf7, #ff6b6b);
                    opacity: 0.3;
                    animation: pulse 2s infinite;
                }

                @keyframes pulse {
                    0%, 100% {
                        transform: scale(1);
                        opacity: 0.3;
                    }
                    50% {
                        transform: scale(1.2);
                        opacity: 0;
                    }
                }

                .step:hover .step-number {
                    transform: scale(1.2) rotate(360deg);
                    box-shadow: 0 20px 50px rgba(74, 108, 247, 0.5);
                }

                .step h3 {
                    font-size: 1.7rem;
                    color: #1e2a4a;
                    margin-bottom: 1rem;
                    font-weight: 700;
                }

                .step p {
                    color: #64748b;
                    line-height: 1.7;
                    font-size: 1.1rem;
                }

                /* CTA Section */
                .cta {
                    padding: 8rem 2rem;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    text-align: center;
                    color: white;
                    position: relative;
                    overflow: hidden;
                }

                .cta::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: 
                        radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.15) 0%, transparent 50%),
                        radial-gradient(circle at 70% 80%, rgba(255, 255, 255, 0.15) 0%, transparent 50%);
                }

                .cta-content {
                    position: relative;
                    z-index: 1;
                }

                .cta h2 {
                    font-size: 3.2rem;
                    margin-bottom: 1.5rem;
                    font-weight: 800;
                    text-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                }

                .cta p {
                    font-size: 1.4rem;
                    margin-bottom: 3rem;
                    opacity: 0.95;
                    max-width: 800px;
                    margin-left: auto;
                    margin-right: auto;
                    line-height: 1.8;
                }

                /* Footer */
                footer {
                    background: linear-gradient(135deg, #1e2a4a 0%, #0f1729 100%);
                    color: white;
                    padding: 5rem 2rem 2rem;
                    position: relative;
                }

                .footer-content {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 3rem;
                    margin-bottom: 3rem;
                }

                .footer-column h3 {
                    margin-bottom: 1.5rem;
                    color: white;
                    font-size: 1.4rem;
                    font-weight: 700;
                    position: relative;
                    padding-bottom: 0.8rem;
                }

                .footer-column h3::after {
                    content: '';
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    width: 50px;
                    height: 3px;
                    background: linear-gradient(90deg, #4a6cf7, #ff6b6b);
                    border-radius: 10px;
                }

                .footer-column p {
                    color: rgba(255, 255, 255, 0.7);
                    line-height: 1.8;
                    font-size: 1.05rem;
                }

                .footer-column ul {
                    list-style: none;
                }

                .footer-column li {
                    margin-bottom: 0.8rem;
                }

                .footer-column a {
                    color: rgba(255, 255, 255, 0.7);
                    text-decoration: none;
                    transition: all 0.3s ease;
                    display: inline-block;
                    font-size: 1.05rem;
                }

                .footer-column a:hover {
                    color: #4a6cf7;
                    transform: translateX(5px);
                }

                .footer-column ul li i {
                    margin-right: 0.8rem;
                    color: #4a6cf7;
                    font-size: 1.1rem;
                }

                .social-links {
                    display: flex;
                    gap: 1rem;
                    margin-top: 1.5rem;
                }

                .social-links a {
                    width: 45px;
                    height: 45px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    backdrop-filter: blur(10px);
                    border: 2px solid rgba(255, 255, 255, 0.1);
                }

                .social-links a:hover {
                    background: linear-gradient(135deg, #4a6cf7, #ff6b6b);
                    transform: translateY(-5px) rotate(5deg);
                    box-shadow: 0 10px 25px rgba(74, 108, 247, 0.4);
                    border-color: transparent;
                }

                .copyright {
                    text-align: center;
                    padding-top: 3rem;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    color: rgba(255, 255, 255, 0.5);
                    font-size: 1.05rem;
                }

                /* Mobile Responsive */
                @media (max-width: 1024px) {
                    .hero-content {
                        grid-template-columns: 1fr;
                        gap: 3rem;
                    }

                    .hero-text h1 {
                        font-size: 3rem;
                    }

                    .hero-image {
                        height: 500px;
                    }

                    .features-grid {
                        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    }
                }

                @media (max-width: 768px) {
                    .mobile-menu {
                        display: block;
                    }

                    nav {
                        position: absolute;
                        top: 100%;
                        left: 0;
                        right: 0;
                        background: white;
                        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                        max-height: 0;
                        overflow: hidden;
                        transition: max-height 0.3s ease;
                    }

                    nav.active {
                        max-height: 400px;
                    }

                    nav ul {
                        flex-direction: column;
                        padding: 1rem 0;
                        gap: 0;
                    }

                    nav li {
                        padding: 0.8rem 2rem;
                    }

                    nav a {
                        color: #1e2a4a !important;
                    }

                    .logo-img {
                        height: 50px;
                    }

                    .logo {
                        font-size: 1.3rem;
                        padding: 0.5rem 1rem;
                    }

                    .hero {
                        padding-top: 120px;
                        padding-bottom: 60px;
                    }

                    .hero-text h1 {
                        font-size: 2.3rem;
                    }

                    .hero-text p {
                        font-size: 1.1rem;
                    }

                    .hero-stats {
                        gap: 2rem;
                    }

                    .stat-number {
                        font-size: 2rem;
                    }

                    .stat-label {
                        font-size: 0.85rem;
                    }

                    .hero-image {
                        height: 400px;
                    }

                    .image-nav {
                        width: 45px;
                        height: 45px;
                        font-size: 1.3rem;
                    }

                    .image-nav.prev {
                        left: 15px;
                    }

                    .image-nav.next {
                        right: 15px;
                    }

                    .image-overlay {
                        padding: 1.5rem;
                        bottom: 55px;
                    }

                    .image-overlay h3 {
                        font-size: 1.3rem;
                    }

                    .image-overlay p {
                        font-size: 0.95rem;
                    }

                    .section-title h2 {
                        font-size: 2.3rem;
                    }

                    .section-title p {
                        font-size: 1.1rem;
                    }

                    .features-grid {
                        grid-template-columns: 1fr;
                    }

                    .cta h2 {
                        font-size: 2.3rem;
                    }

                    .cta p {
                        font-size: 1.1rem;
                    }

                    .btn {
                        padding: 1.1rem 2.5rem;
                        font-size: 1rem;
                    }
                }

                @media (max-width: 480px) {
                    .container {
                        padding: 0 1rem;
                    }

                    .hero-text h1 {
                        font-size: 1.9rem;
                    }

                    .hero-stats {
                        flex-direction: column;
                        gap: 1.5rem;
                    }

                    .feature-card {
                        padding: 2rem;
                    }

                    .step {
                        padding: 1.5rem;
                    }
                }
            `}</style>

            {/* Header */}
            <header className={scrolled ? 'scrolled' : ''}>
                <div className="container">
                    <div className="header-content">
                        <div className="logo-container">
                            <img src="/images/logo1.png" alt="AI Travel Guide Logo" className="logo-img" />
                            <div className="logo">
                                <i className="fas fa-route"></i>
                                AI Travel Guide
                            </div>
                        </div>
                        <div className="mobile-menu">
                            <i className="fas fa-bars"></i>
                        </div>
                        <nav>
                            <ul>
                                <li><a href="#home">Home</a></li>
                                <li><a href="#features">Features</a></li>
                                <li><a href="#how-it-works">How It Works</a></li>
                                <li><a href="#testimonials">Testimonials</a></li>
                                <li><a href="#contact">Contact</a></li>
                            </ul>
                        </nav>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="hero" id="home">
                <div className="container">
                    <div className="hero-content">
                        <div className="hero-text">
                            <h1>Plan Perfect Trips with Intelligent Recommendations</h1>
                            <p>Discover your next adventure with AI-powered travel planning that understands your preferences and creates personalized itineraries.</p>
                            
                            <div className="hero-stats">
                                <div className="stat-item">
                                    <div className="stat-number">10K+</div>
                                    <div className="stat-label">Happy Travelers</div>
                                </div>
                                <div className="stat-item">
                                    <div className="stat-number">50K+</div>
                                    <div className="stat-label">Trips Planned</div>
                                </div>
                                <div className="stat-item">
                                    <div className="stat-number">100+</div>
                                    <div className="stat-label">Destinations</div>
                                </div>
                            </div>

                            <button className="btn" onClick={handleGetStarted}>
                                Start Your Journey
                                <i className="fas fa-arrow-right"></i>
                            </button>
                        </div>
                        <div className="hero-image">
                            <div className="hero-image-slider">
                                {heroImages.map((image, index) => (
                                    <img 
                                        key={index}
                                        src={image.url}
                                        alt={image.title}
                                        className={heroImage === index ? 'active' : ''}
                                        onError={(e) => {
                                            e.target.src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&h=900&fit=crop&q=90';
                                        }}
                                    />
                                ))}
                                
                                <div className="image-overlay">
                                    <h3>{heroImages[heroImage].title}</h3>
                                    <p><i className="fas fa-map-marker-alt"></i> {heroImages[heroImage].location}</p>
                                </div>

                                <button 
                                    className="image-nav prev" 
                                    onClick={() => setHeroImage((prev) => (prev - 1 + heroImages.length) % heroImages.length)}
                                    aria-label="Previous image"
                                >
                                    <i className="fas fa-chevron-left"></i>
                                </button>
                                
                                <button 
                                    className="image-nav next" 
                                    onClick={() => setHeroImage((prev) => (prev + 1) % heroImages.length)}
                                    aria-label="Next image"
                                >
                                    <i className="fas fa-chevron-right"></i>
                                </button>

                                <div className="image-dots">
                                    {heroImages.map((_, index) => (
                                        <div 
                                            key={index}
                                            className={`dot ${heroImage === index ? 'active' : ''}`}
                                            onClick={() => setHeroImage(index)}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features" id="features">
                <div className="container">
                    <div className="section-title">
                        <h2>Start Your Journey</h2>
                        <p>Experience travel planning like never before with our AI-powered features</p>
                    </div>
                    <div className="features-grid">
                        <div className="feature-card">
                            <div className="feature-icon">
                                <i className="fas fa-map-marked-alt"></i>
                            </div>
                            <h3>Smart Destinations</h3>
                            <ul>
                                <li>AI-powered recommendations based on your preferences</li>
                                <li>Personalized suggestions matching your travel style</li>
                                <li>Hidden gems and popular spots tailored to you</li>
                            </ul>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">
                                <i className="fas fa-calendar-alt"></i>
                            </div>
                            <h3>Day-by-Day Planning</h3>
                            <ul>
                                <li>Detailed itineraries with optimal timing</li>
                                <li>Smart route planning to save time</li>
                                <li>Real-time adjustments based on weather and events</li>
                            </ul>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">
                                <i className="fas fa-user-friends"></i>
                            </div>
                            <h3>Personalized Experience</h3>
                            <ul>
                                <li>Tailored suggestions for solo travelers</li>
                                <li>Perfect plans for couples and families</li>
                                <li>Group travel optimization</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="how-it-works" id="how-it-works">
                <div className="container">
                    <div className="section-title">
                        <h2>How It Works</h2>
                        <p>Getting your perfect travel plan is simple with our AI-powered platform</p>
                    </div>
                    <div className="steps">
                        <div className="step">
                            <div className="step-number">1</div>
                            <h3>Sign Up</h3>
                            <p>Create your account in seconds with just your email</p>
                        </div>
                        <div className="step">
                            <div className="step-number">2</div>
                            <h3>Set Preferences</h3>
                            <p>Tell us your travel style, interests, and budget</p>
                        </div>
                        <div className="step">
                            <div className="step-number">3</div>
                            <h3>AI Planning</h3>
                            <p>Get personalized itineraries instantly generated for you</p>
                        </div>
                        <div className="step">
                            <div className="step-number">4</div>
                            <h3>Enjoy!</h3>
                            <p>Follow your perfect trip plan and create memories</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta" id="testimonials">
                <div className="container">
                    <div className="cta-content">
                        <h2>Ready to Transform Your Travel Experience?</h2>
                        <p>Join thousands of travelers who are already using AI Travel Guide to plan their perfect trips</p>
                        <button className="btn" onClick={handleGetStarted}>
                            Start Your Journey Now
                            <i className="fas fa-rocket"></i>
                        </button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer id="contact">
                <div className="container">
                    <div className="footer-content">
                        <div className="footer-column">
                            <h3>AI Travel Guide</h3>
                            <p>Plan perfect trips with intelligent recommendations tailored just for you.</p>
                            <div className="social-links">
                                <a href="#"><i className="fab fa-facebook-f"></i></a>
                                <a href="#"><i className="fab fa-twitter"></i></a>
                                <a href="#"><i className="fab fa-instagram"></i></a>
                                <a href="#"><i className="fab fa-linkedin-in"></i></a>
                            </div>
                        </div>
                        <div className="footer-column">
                            <h3>Quick Links</h3>
                            <ul>
                                <li><a href="#home">Home</a></li>
                                <li><a href="#features">Features</a></li>
                                <li><a href="#how-it-works">How It Works</a></li>
                                <li><Link href="/loggin_signup">Login/Signup</Link></li>
                            </ul>
                        </div>
                        <div className="footer-column">
                            <h3>Support</h3>
                            <ul>
                                <li><a href="#help">Help Center</a></li>
                                <li><a href="#contact">Contact Us</a></li>
                                <li><a href="#privacy">Privacy Policy</a></li>
                                <li><a href="#terms">Terms of Service</a></li>
                            </ul>
                        </div>
                        <div className="footer-column">
                            <h3>Contact Info</h3>
                            <ul>
                                <li><i className="fas fa-envelope"></i> hello@aitravelguide.com</li>
                                <li><i className="fas fa-phone"></i> +1 (555) 123-4567</li>
                                <li><i className="fas fa-map-marker-alt"></i> 123 Travel Street, Adventure City</li>
                            </ul>
                        </div>
                    </div>
                    <div className="copyright">
                        <p>&copy; 2023 AI Travel Guide. All rights reserved.</p>
                    </div>
                </div>
            </footer>

            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
        </div>
    );
};

export default HomePage;