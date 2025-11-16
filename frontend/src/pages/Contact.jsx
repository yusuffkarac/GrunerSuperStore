import { motion } from 'framer-motion';
import { FiMapPin, FiMail, FiPhone } from 'react-icons/fi';

function Contact() {
  // Adres bilgileri
  const addressForMap = encodeURIComponent("Fliederweg 2, 71332 Waiblingen, Almanya");
  
  // Google Maps embed URL (API key olmadan çalışır)
  const mapEmbedUrl = `https://maps.google.com/maps?q=${addressForMap}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  
  // Google Maps yönlendirme linki
  const directionsUrl = "https://www.google.com/maps/dir/?api=1&destination=R8C7%2B32+Waiblingen+Germany";

  const contactInfo = [
    {
      icon: FiMapPin,
      title: "Adresse",
      content: "Fliederweg 2, 71332 Waiblingen, Almanya",
      link: directionsUrl,
      color: "from-blue-500 to-blue-600"
    },
    {
      icon: FiPhone,
      title: "Telefon",
      content: "07151 2562255",
      link: "tel:+4971512562255",
      color: "from-green-500 to-green-600"
    },
    {
      icon: FiMail,
      title: "E-Mail",
      content: "info@gruner-super.store",
      link: "mailto:info@gruner-super.store",
      color: "from-purple-500 to-purple-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="container-mobile py-8 md:py-12">
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 mb-4 shadow-md">
            <FiMapPin className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Kontakt
          </h1>
          <p className="text-base text-gray-600 max-w-2xl mx-auto">
            Wir sind für Sie da! Kontaktieren Sie uns gerne per Telefon, E-Mail oder besuchen Sie uns vor Ort.
          </p>
        </motion.div>

        {/* Map and Contact Info - Side by Side */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"
        >
          {/* Map Section - Left */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden order-2 lg:order-1">
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-primary-100">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FiMapPin className="w-5 h-5 text-primary-600" />
                Standort
              </h2>
            </div>
            <div className="relative w-full" style={{ height: '500px' }}>
              <iframe
                src={mapEmbedUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={true}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Gruner Super Store Location"
                className="absolute inset-0"
              />
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-200">
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
              >
                <FiMapPin className="w-4 h-4" />
                Route in Google Maps öffnen
              </a>
            </div>
          </div>

          {/* Contact Info Section - Right */}
          <div className="space-y-4 order-1 lg:order-2">
            {contactInfo.map((info, index) => {
              const Icon = info.icon;
              const isExternalLink = info.link.startsWith('http');
              return (
                <motion.a
                  key={index}
                  href={info.link}
                  {...(isExternalLink && {
                    target: '_blank',
                    rel: 'noopener noreferrer'
                  })}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 + index * 0.1 }}
                  className="group bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg hover:border-primary-300 transition-all duration-200 block cursor-pointer"
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br ${info.color} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-200`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 mb-2 text-lg group-hover:text-primary-700 transition-colors">
                        {info.title}
                      </h3>
                      <p className="text-base text-gray-600 break-words leading-relaxed">
                        {info.content}
                      </p>
                    </div>
                  </div>
                </motion.a>
              );
            })}

            {/* Additional Info Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.5 }}
              className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl border border-primary-200 p-6"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center">
                  <FiMail className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Öffnungszeiten & Support</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Unser Kundenservice ist für Sie da. Schreiben Sie uns eine E-Mail oder rufen Sie uns an. 
                    Wir antworten Ihnen so schnell wie möglich.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default Contact;

