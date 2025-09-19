import React, { useState, useCallback } from 'react';
import { ICONS } from '../constants';

const REFRESH_THRESHOLD = 80; // Pixels to pull down to trigger refresh
const PULL_RESISTANCE = 0.5; // Makes pulling feel heavier

interface UsePullToRefreshProps {
  onRefresh: () => Promise<any>;
}

/**
 * A hook to manage the state and event handlers for a pull-to-refresh action.
 * @param onRefresh - An async function to call when a refresh is triggered.
 */
export const usePullToRefresh = ({ onRefresh }: UsePullToRefreshProps) => {
  const [pullStart, setPullStart] = useState<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isPulling = pullStart !== null;

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  }, [onRefresh]);

  const touchStartHandler = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const scrollableElement = e.currentTarget.closest('.overflow-y-auto');
    if (scrollableElement && scrollableElement.scrollTop === 0 && !isRefreshing) {
      setPullStart(e.touches[0].clientY);
    }
  }, [isRefreshing]);

  const touchMoveHandler = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (pullStart === null || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    let distance = currentY - pullStart;

    if (distance > 0) {
      // Prevent browser's default overscroll behavior
      e.preventDefault();
      setPullDistance(distance * PULL_RESISTANCE);
    } else {
        // If user pulls up again, reset
        setPullStart(null);
        setPullDistance(0);
    }
  }, [pullStart, isRefreshing]);

  const touchEndHandler = useCallback(() => {
    if (pullStart === null || isRefreshing) return;

    if (pullDistance > REFRESH_THRESHOLD) {
      handleRefresh();
    }
    
    setPullStart(null);
    setPullDistance(0);
  }, [pullStart, pullDistance, isRefreshing, handleRefresh]);
  
  const handlers = {
    onTouchStart: touchStartHandler,
    onTouchMove: touchMoveHandler,
    onTouchEnd: touchEndHandler,
  };

  return { isRefreshing, pullDistance, isPulling, handlers };
};


interface PullToRefreshIndicatorProps {
  isRefreshing: boolean;
  pullDistance: number;
}

export const PullToRefreshIndicator: React.FC<PullToRefreshIndicatorProps> = ({ isRefreshing, pullDistance }) => {
  const rotation = Math.min(pullDistance, REFRESH_THRESHOLD + 20);
  
  return (
    <div
      className="absolute top-0 left-0 right-0 flex justify-center items-center pointer-events-none z-0"
      style={{
        transform: `translateY(${isRefreshing ? (60 - 50) : (pullDistance - 50)}px)`,
        opacity: isRefreshing ? 1 : Math.max(0, (pullDistance - 10) / REFRESH_THRESHOLD),
      }}
      aria-hidden={!isRefreshing && pullDistance === 0}
      role="status"
      aria-live="polite"
    >
      <div 
        className={`bg-surface shadow-md rounded-full w-10 h-10 flex items-center justify-center transition-transform duration-200 ${isRefreshing ? 'animate-spin' : ''}`}
        style={{ transform: `rotate(${isRefreshing ? 0 : rotation * 3}deg)` }}
      >
        {ICONS.refresh}
      </div>
    </div>
  );
};
