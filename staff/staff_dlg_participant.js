function Init()
{
	trainingProgram = this.training_program_id.ForeignElem;

	for ( part in trainingProgram.parts )
	{
		partEntry = this.target_parts.ObtainChildByKey( part.id );
	}

	this.target_parts.Sort( 'part_id.ForeignElem.ChildIndex', '+' );
}
