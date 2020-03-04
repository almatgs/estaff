function desc()
{
	str = name;
	if ( division_id.HasValue )
		str += ', ' + division_id.ForeignDispName;

	return str;
}