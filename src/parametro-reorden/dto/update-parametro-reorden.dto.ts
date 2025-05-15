import { PartialType } from '@nestjs/mapped-types';
import { CreateParametroReordenDto } from './create-parametro-reorden.dto';

export class UpdateParametroReordenDto extends PartialType(CreateParametroReordenDto) {}