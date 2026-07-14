import { useRef, useEffect } from 'react';
import { Platform } from 'react-native';

export function useWebDragScroll() {
  const scrollRef = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const el = scrollRef.current;
    const node = el?.getScrollableNode ? el.getScrollableNode() : el;
    if (!node || !node.addEventListener) return;

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDown = true;
      node.style.cursor = 'grabbing';
      startX = e.pageX - node.offsetLeft;
      scrollLeft = node.scrollLeft;
    };

    const onMouseLeave = () => {
      isDown = false;
      node.style.cursor = 'grab';
    };

    const onMouseUp = () => {
      isDown = false;
      node.style.cursor = 'grab';
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - node.offsetLeft;
      const walk = (x - startX) * 1.5;
      node.scrollLeft = scrollLeft - walk;
    };

    node.addEventListener('mousedown', onMouseDown, { capture: true });
    node.addEventListener('mouseleave', onMouseLeave, { capture: true });
    node.addEventListener('mouseup', onMouseUp, { capture: true });
    node.addEventListener('mousemove', onMouseMove, { capture: true });
    node.style.cursor = 'grab';

    return () => {
      node.removeEventListener('mousedown', onMouseDown, { capture: true });
      node.removeEventListener('mouseleave', onMouseLeave, { capture: true });
      node.removeEventListener('mouseup', onMouseUp, { capture: true });
      node.removeEventListener('mousemove', onMouseMove, { capture: true });
    };
  }, []);

  return scrollRef;
}
