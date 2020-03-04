function GenerateUniqueStageID()
{
	for ( baseID = 1; ; baseID++ )
	{
		stageID = 's' + StrInt( baseID, 2 );
		if ( ArrayOptFindByKey( this.stages, stageID, 'id' ) == undefined )
			break;
	}

	return stageID;
}