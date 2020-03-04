function Init()
{
	widthMeasure = '42zr';
	heightMeasure = '25zr';

	if ( data_type == 'date' && ! use_time )
	{
		width = CalcTextScreenWidth( this.title + ':' ) + ActiveScreen.ZrSize * 14 + 29;
		widthMeasure = width + 'px';
		heightMeasure = '19zr';
	}
}