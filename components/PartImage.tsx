import React, { useState, useEffect } from 'react';

// Global cache to prevent re-fetching the same part image
const imageCache = new Map<string, string>();

interface PartImageProps {
    partName: string;
    type: 'blade' | 'ratchet' | 'bit';
    wikiUrl?: string;
    className?: string;
}

// Manual overrides for parts where the sheet name differs from the Wiki title
const NAME_OVERRIDES: Record<string, string> = {
    "Wyvern Hover": "Hover Wyvern",
    "Unicorn Sting": "Sting Unicorn",
    "Dran Sword": "Sword Dran",
    "Hells Scythe": "Scythe Incendio"
};

const PartImage: React.FC<PartImageProps> = ({ partName, type, wikiUrl, className = '' }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchImage = async () => {
            // Create a cache key using name and URL to ensure uniqueness
            const cacheKey = `${partName}-${wikiUrl || ''}`;

            if (imageCache.has(cacheKey)) {
                setImageUrl(imageCache.get(cacheKey)!);
                setLoading(false);
                return;
            }

            // Try to extract title from Wiki URL or use overrides
            let pageTitle = '';

            const searchName = NAME_OVERRIDES[partName] || partName;

            if (wikiUrl && !NAME_OVERRIDES[partName]) {
                const match = wikiUrl.match(/\/wiki\/(.+)$/);
                if (match) pageTitle = match[1];
            }

            if (!pageTitle) {
                // Fallback: construct title from name (less reliable)
                pageTitle = `${type === 'blade' ? 'Blade' : type === 'ratchet' ? 'Ratchet' : 'Bit'}_-_${searchName.replace(/\s+/g, '_')}`;
            }

            if (!pageTitle) {
                setLoading(false);
                return;
            }

            try {
                const apiUrl = `https://beyblade.fandom.com/api.php?action=query&titles=${pageTitle}&prop=pageimages&format=json&pithumbsize=200&origin=*`;
                const response = await fetch(apiUrl);
                const data = await response.json();

                const pages = data.query?.pages;
                if (pages) {
                    const pageId = Object.keys(pages)[0];
                    const page = pages[pageId];
                    if (page.thumbnail?.source) {
                        const originalSrc = page.thumbnail.source;
                        // Use wsrv.nl to proxy the image and bypass Fandom's hotlink protection
                        const proxySrc = `https://wsrv.nl/?url=${encodeURIComponent(originalSrc)}`;
                        imageCache.set(cacheKey, proxySrc);
                        setImageUrl(proxySrc);
                    }
                }
            } catch (err) {
                // Silent fail, just show placeholder
                console.warn(`Failed to fetch image for ${partName}`, err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        fetchImage();
    }, [partName, wikiUrl, type]);

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();
    };

    const getColor = (type: string) => {
        switch (type) {
            case 'blade': return 'from-blue-600 to-cyan-500';
            case 'ratchet': return 'from-purple-600 to-pink-500';
            case 'bit': return 'from-amber-500 to-orange-600';
            case 'lock_chip': return 'from-yellow-500 to-amber-400';
            case 'assist_blade': return 'from-slate-500 to-slate-400';
            default: return 'from-slate-700 to-slate-600';
        }
    };

    const getLabel = (type: string) => {
        switch (type) {
            case 'lock_chip': return 'LOCK';
            case 'assist_blade': return 'ASSIST';
            default: return type;
        }
    }

    return (
        <div className={`relative overflow-hidden rounded-xl shadow-lg border border-white/10 bg-slate-900 ${className}`}>
            {imageUrl && !error ? (
                <div className="w-full h-full relative flex items-center justify-center bg-black/20">
                    <img
                        src={imageUrl}
                        alt={partName}
                        referrerPolicy="no-referrer"
                        onError={() => setError(true)}
                        className="h-full w-auto object-contain max-w-full p-2 hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent pointer-events-none"></div>
                </div>
            ) : (
                <div className={`w-full h-full bg-gradient-to-br ${getColor(type)} flex items-center justify-center`}>
                    {/* 3D-ish effect overlay */}
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px]"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>

                    <span className="relative z-10 text-white font-black italic text-lg tracking-widest drop-shadow-md opacity-50">
                        {getInitials(partName)}
                    </span>
                </div>
            )}

            {/* Type label badge */}
            <div className="absolute bottom-0 left-0 right-0 py-1 px-1 flex justify-center">
                <span className={`text-[7px] uppercase tracking-widest font-black text-white/90 px-2 py-[1px] rounded-full border border-white/10 backdrop-blur-md shadow-sm ${type === 'blade' ? 'bg-blue-600/60' :
                        type === 'ratchet' ? 'bg-pink-600/60' :
                            type === 'bit' ? 'bg-orange-600/60' :
                                type === 'lock_chip' ? 'bg-yellow-600/60' : 'bg-slate-600/60'
                    }`}>
                    {getLabel(type)}
                </span>
            </div>
        </div>
    );
};

export default PartImage;
