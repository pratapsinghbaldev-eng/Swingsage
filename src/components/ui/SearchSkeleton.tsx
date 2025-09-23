export default function SearchSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse bg-white rounded-lg border border-gray-200 p-4"
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              {/* Company name skeleton */}
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
              
              {/* Symbol skeleton */}
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-3"></div>
            </div>
            
            <div className="text-right">
              {/* Price skeleton */}
              <div className="h-6 bg-gray-200 rounded w-20 mb-1"></div>
              
              {/* Change skeleton */}
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
