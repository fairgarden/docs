'use client';

import * as React from 'react';
import { Slider } from '@base-ui/react/slider';
import { Flower } from '@/components/Flower';
import styles from './PetalSlider.module.css';

interface PetalSliderProps {
  /** Petal count the slider starts at. */
  defaultPetals?: number;
}

export function PetalSlider({ defaultPetals = 8 }: PetalSliderProps) {
  // @focus-start @padding 1
  const [petals, setPetals] = React.useState<number>(defaultPetals);

  return (
    <div className={styles.root}>
      <Flower petals={petals} label={`A flower with ${petals} petals`} />
      <Slider.Root min={3} max={16} value={petals} onValueChange={setPetals}>
        <output className={styles.value}>{petals} petals</output>
        <Slider.Control className={styles.control}>
          <Slider.Track className={styles.track}>
            <Slider.Indicator className={styles.indicator} />
            <Slider.Thumb className={styles.thumb} aria-label="Petals" />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
    </div>
  );
  // @focus-end
}
