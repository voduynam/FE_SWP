import { Link } from 'react-router-dom';
import {
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { path: '/', label: 'Home' },
    { path: '/courses', label: 'Courses' },
    { path: '/programs', label: 'Programs' },
    { path: '/blog', label: 'Blog' },
    { path: '/about', label: 'About Us' },
  ];

  const resources = [
    { path: '/learning-paths/recommended', label: 'Learning Paths' },
    { path: '/consultations', label: 'Consultations' },
    { path: '/surveys', label: 'Surveys' },
    { path: '/certificates', label: 'Certificates' },
  ];

  const support = [
    { path: '/help', label: 'Help Center' },
    { path: '/contact', label: 'Contact Us' },
    { path: '/faq', label: 'FAQ' },
    { path: '/terms', label: 'Terms of Service' },
    { path: '/privacy', label: 'Privacy Policy' },
  ];

  const socialLinks = [
    { icon: Facebook, href: '#', label: 'Facebook' },
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Instagram, href: '#', label: 'Instagram' },
    { icon: Linkedin, href: '#', label: 'LinkedIn' },
  ];

  return (
    <footer className='bg-gray-900 text-gray-300'>
      <div className='container mx-auto px-4 py-12'>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8'>
          {/* Company Info */}
          <div className='space-y-4'>
            <div className='flex items-center space-x-2'>
              <div className='bg-blue-600 text-white px-3 py-1 rounded-lg font-bold text-xl'>
                SWP391
              </div>
              <span className='text-white font-semibold text-lg'>
                Learning Platform
              </span>
            </div>
            <p className='text-sm text-gray-400 leading-relaxed'>
              Empowering individuals through education and consultation. 
              Join us on your learning journey.
            </p>
            <div className='flex space-x-4'>
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors'
                  aria-label={social.label}
                >
                  <social.icon className='w-5 h-5' />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className='text-white font-semibold text-lg mb-4'>Quick Links</h3>
            <ul className='space-y-2'>
              {quickLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className='text-sm hover:text-blue-400 transition-colors flex items-center space-x-1'
                  >
                    <span>•</span>
                    <span>{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className='text-white font-semibold text-lg mb-4'>Resources</h3>
            <ul className='space-y-2'>
              {resources.map((resource) => (
                <li key={resource.path}>
                  <Link
                    to={resource.path}
                    className='text-sm hover:text-blue-400 transition-colors flex items-center space-x-1'
                  >
                    <span>•</span>
                    <span>{resource.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className='text-white font-semibold text-lg mb-4'>Contact Us</h3>
            <ul className='space-y-3'>
              <li className='flex items-start space-x-3'>
                <MapPin className='w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0' />
                <span className='text-sm'>
                  123 Education Street<br />
                  Learning City, LC 12345
                </span>
              </li>
              <li className='flex items-center space-x-3'>
                <Phone className='w-5 h-5 text-blue-400 flex-shrink-0' />
                <a
                  href='tel:+1234567890'
                  className='text-sm hover:text-blue-400 transition-colors'
                >
                  +1 (234) 567-890
                </a>
              </li>
              <li className='flex items-center space-x-3'>
                <Mail className='w-5 h-5 text-blue-400 flex-shrink-0' />
                <a
                  href='mailto:support@swp391.com'
                  className='text-sm hover:text-blue-400 transition-colors'
                >
                  support@swp391.com
                </a>
              </li>
            </ul>

            {/* Support Links */}
            <div className='mt-6'>
              <h4 className='text-white font-medium text-sm mb-3'>Support</h4>
              <ul className='space-y-1'>
                {support.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className='text-xs hover:text-blue-400 transition-colors'
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className='border-t border-gray-800 mt-8 pt-8'>
          <div className='flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0'>
            <p className='text-sm text-gray-400 text-center md:text-left'>
              © {currentYear} SWP391 Learning Platform. All rights reserved.
            </p>
            <div className='flex items-center space-x-6 text-sm'>
              <Link
                to='/terms'
                className='hover:text-blue-400 transition-colors'
              >
                Terms
              </Link>
              <Link
                to='/privacy'
                className='hover:text-blue-400 transition-colors'
              >
                Privacy
              </Link>
              <Link
                to='/cookies'
                className='hover:text-blue-400 transition-colors'
              >
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

