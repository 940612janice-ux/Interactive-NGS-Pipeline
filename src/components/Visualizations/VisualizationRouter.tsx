import React from 'react';
import { BclRawVisualization } from './BclRawVisualization';
import { BasecallingVisualization } from './BasecallingVisualization';
import { DemultiplexingVisualization } from './DemultiplexingVisualization';
import { FastQCVisualization } from './FastQCVisualization';
import { TrimmingVisualization } from './TrimmingVisualization';
import { AlignmentVisualization } from './AlignmentVisualization';
import { MarkDuplicatesVisualization } from './MarkDuplicatesVisualization';
import { BqsrVisualization } from './BqsrVisualization';
import { Mutect2Visualization } from './Mutect2Visualization';
import { GnomadVisualization } from './GnomadVisualization';
import { PonVisualization } from './PonVisualization';
import { ContaminationVisualization } from './ContaminationVisualization';
import { OrientationBiasVisualization } from './OrientationBiasVisualization';
import { FilterMutectVisualization } from './FilterMutectVisualization';
import { AnnotationVisualization } from './AnnotationVisualization';
import { GenericVisualization } from './GenericVisualization';

interface VisualizationRouterProps {
  visualType: string;
  onComplete?: () => void;
}

export const VisualizationRouter: React.FC<VisualizationRouterProps> = ({ visualType, onComplete }) => {
  switch (visualType) {
    case 'bcl-raw':
      return <BclRawVisualization onComplete={onComplete} />;
    case 'basecalling':
      return <BasecallingVisualization onComplete={onComplete} />;
    case 'demultiplexing':
      return <DemultiplexingVisualization onComplete={onComplete} />;
    case 'fastqc':
      return <FastQCVisualization onComplete={onComplete} />;
    case 'trimming':
      return <TrimmingVisualization onComplete={onComplete} />;
    case 'alignment':
      return <AlignmentVisualization onComplete={onComplete} />;
    case 'mark-duplicates':
      return <MarkDuplicatesVisualization onComplete={onComplete} />;
    case 'bqsr':
      return <BqsrVisualization onComplete={onComplete} />;
    case 'mutect2':
      return <Mutect2Visualization onComplete={onComplete} />;
    case 'gnomad':
      return <GnomadVisualization onComplete={onComplete} />;
    case 'pon':
      return <PonVisualization onComplete={onComplete} />;
    case 'contamination':
      return <ContaminationVisualization onComplete={onComplete} />;
    case 'orientation-bias':
      return <OrientationBiasVisualization onComplete={onComplete} />;
    case 'filter-mutect':
      return <FilterMutectVisualization onComplete={onComplete} />;
    case 'annotation':
      return <AnnotationVisualization onComplete={onComplete} />;
    default:
      return <GenericVisualization visualType={visualType} onComplete={onComplete} />;
  }
};