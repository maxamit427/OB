import { motion } from "framer-motion";

export default function Web3Showcase() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="inline-block px-4 py-1 rounded-full border border-orange-500/30 bg-orange-500/10 mb-6 shadow-[0_0_20px_rgba(249,115,22,0.2)]">
                <span className="text-xs font-tech uppercase tracking-widest text-orange-500">Future Ready</span>
              </div>
              <h2 className="text-4xl md:text-6xl font-heading font-bold mb-6">
                Built for the <br />
                <span className="bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 text-transparent bg-clip-text drop-shadow-[0_0_30px_rgba(249,115,22,0.5)]">Decentralized Web</span>
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                We don't just support Web3 projects; we live in the ecosystem. From smart contract auditing guidance to DAO governance protection, we speak the language of the blockchain.
              </p>
              
              <ul className="space-y-4">
                {[
                  "Smart Contract Safety Protocols",
                  "Decentralized Identity Verification",
                  "NFT Intellectual Property Rights",
                  "DAO Community Governance"
                ].map((item, i) => (
                  <motion.li 
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3 text-white/80"
                  >
                    <div className="w-2 h-2 bg-orange-500 rounded-full shadow-[0_0_15px_rgba(249,115,22,0.8)]" />
                    {item}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </div>
          
          <div className="flex-1 relative flex justify-center">
            <motion.div 
              className="relative w-80 h-80"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 1 }}
            >
              {/* Abstract Floating Elements */}
              <motion.div 
                className="absolute top-0 left-10 w-20 h-20 bg-primary/20 backdrop-blur-xl border border-primary/40 rounded-2xl transform rotate-12"
                animate={{ y: [-20, 20, -20], rotate: [12, 24, 12] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div 
                className="absolute bottom-10 right-10 w-24 h-24 bg-secondary/20 backdrop-blur-xl border border-secondary/40 rounded-full"
                animate={{ y: [20, -20, 20], scale: [1, 1.1, 1] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div 
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-accent/10 backdrop-blur-xl border border-accent/30 rounded-xl flex items-center justify-center"
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <div className="w-32 h-32 border border-white/10 rounded-full" />
              </motion.div>
              
              {/* Center Cube */}
              <motion.div 
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl flex items-center justify-center"
                animate={{ rotateX: [0, 360], rotateY: [0, 360] }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              >
                 <div className="w-10 h-10 bg-white/20 rounded-lg" />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}