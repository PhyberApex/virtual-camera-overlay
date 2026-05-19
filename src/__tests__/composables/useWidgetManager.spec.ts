import { describe, it, expect, beforeEach } from 'vitest';
import { useWidgetManager } from '../../composables/useWidgetManager';

const makeWidget = (id: string) => ({
  id,
  type: 'sensor',
  position: { x: 0, y: 0 },
  size: { width: 100, height: 50 },
});

describe('useWidgetManager', () => {
  const { widgets, addWidget, removeWidget, updateWidget, clearWidgets } = useWidgetManager();

  beforeEach(() => {
    clearWidgets();
  });

  it('starts with no widgets', () => {
    expect(widgets.value).toHaveLength(0);
  });

  it('adds a widget', () => {
    addWidget(makeWidget('a'));
    expect(widgets.value).toHaveLength(1);
    expect(widgets.value[0]!.id).toBe('a');
  });

  it('removes a widget by id', () => {
    addWidget(makeWidget('a'));
    addWidget(makeWidget('b'));
    removeWidget('a');
    expect(widgets.value).toHaveLength(1);
    expect(widgets.value[0]!.id).toBe('b');
  });

  it('updates a widget', () => {
    addWidget(makeWidget('a'));
    updateWidget('a', { type: 'temperature' });
    expect(widgets.value[0]!.type).toBe('temperature');
  });

  it('ignores updateWidget for unknown id', () => {
    addWidget(makeWidget('a'));
    updateWidget('nope', { type: 'temperature' });
    expect(widgets.value[0]!.type).toBe('sensor');
  });

  it('shares state across composable instances (singleton)', () => {
    addWidget(makeWidget('shared'));
    const { widgets: widgets2 } = useWidgetManager();
    expect(widgets2.value[0]!.id).toBe('shared');
  });

  it('clears all widgets', () => {
    addWidget(makeWidget('a'));
    addWidget(makeWidget('b'));
    clearWidgets();
    expect(widgets.value).toHaveLength(0);
  });
});
