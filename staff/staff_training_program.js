function OnBeforeSave()
{
	for ( part in this.parts )
	{
		if ( ! part.id.HasValue )
			part.id = UniqueID();

		if ( ! part.duration.length.HasValue )
		{
			part.duration.length = 1;
			part.duration.unit_id = 'hour';
		}
	}
}
